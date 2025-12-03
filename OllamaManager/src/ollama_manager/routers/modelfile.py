"""Modelfile Router - Modelfile validation and management"""

import re
from fastapi import APIRouter, Depends, HTTPException, Security

from ..core.security import get_current_user, User
from ..services.logging_service import logging_service
from ..models.requests import ModelfileValidateRequest, ModelfileFormatRequest, ModelfilePreviewRequest
from ..models.responses import APIResponse, ModelfileValidationResponse

router = APIRouter(prefix="/modelfile", tags=["Modelfile"])


MODELFILE_INSTRUCTIONS = {
    "FROM": {
        "required": True,
        "description": "Base model to use",
        "pattern": r"^FROM\s+\S+"
    },
    "PARAMETER": {
        "required": False,
        "description": "Model parameters",
        "pattern": r"^PARAMETER\s+\w+\s+.+"
    },
    "TEMPLATE": {
        "required": False,
        "description": "Prompt template",
        "pattern": r"^TEMPLATE\s+"
    },
    "SYSTEM": {
        "required": False,
        "description": "System prompt",
        "pattern": r"^SYSTEM\s+"
    },
    "ADAPTER": {
        "required": False,
        "description": "LoRA adapter",
        "pattern": r"^ADAPTER\s+\S+"
    },
    "LICENSE": {
        "required": False,
        "description": "Model license",
        "pattern": r"^LICENSE\s+"
    },
    "MESSAGE": {
        "required": False,
        "description": "Example message",
        "pattern": r"^MESSAGE\s+(user|assistant)\s+.+"
    }
}


def parse_modelfile(content: str) -> dict:
    lines = content.strip().split("\n")
    result = {
        "base_model": None,
        "parameters": {},
        "template": None,
        "system": None,
        "adapter": None,
        "license": None,
        "messages": []
    }
    
    current_instruction = None
    current_value = []
    
    for line in lines:
        stripped = line.strip()
        
        if not stripped or stripped.startswith("#"):
            continue
        
        instruction_found = False
        for instruction in MODELFILE_INSTRUCTIONS:
            if stripped.upper().startswith(instruction):
                if current_instruction and current_value:
                    _apply_instruction(result, current_instruction, "\n".join(current_value))
                
                current_instruction = instruction
                current_value = [stripped[len(instruction):].strip()]
                instruction_found = True
                break
        
        if not instruction_found and current_instruction:
            current_value.append(line)
    
    if current_instruction and current_value:
        _apply_instruction(result, current_instruction, "\n".join(current_value))
    
    return result


def _apply_instruction(result: dict, instruction: str, value: str):
    value = value.strip()
    
    if value.startswith('"""') and value.endswith('"""'):
        value = value[3:-3]
    elif value.startswith('"') and value.endswith('"'):
        value = value[1:-1]
    
    if instruction == "FROM":
        result["base_model"] = value
    elif instruction == "PARAMETER":
        parts = value.split(None, 1)
        if len(parts) == 2:
            param_name, param_value = parts
            try:
                if "." in param_value:
                    result["parameters"][param_name] = float(param_value)
                else:
                    result["parameters"][param_name] = int(param_value)
            except ValueError:
                result["parameters"][param_name] = param_value
    elif instruction == "TEMPLATE":
        result["template"] = value
    elif instruction == "SYSTEM":
        result["system"] = value
    elif instruction == "ADAPTER":
        result["adapter"] = value
    elif instruction == "LICENSE":
        result["license"] = value
    elif instruction == "MESSAGE":
        parts = value.split(None, 1)
        if len(parts) == 2:
            role, content = parts
            result["messages"].append({"role": role, "content": content})


def validate_modelfile(content: str) -> tuple[bool, list[str], list[str]]:
    errors = []
    warnings = []
    
    if not content.strip():
        errors.append("Modelfile is empty")
        return False, errors, warnings
    
    lines = content.strip().split("\n")
    has_from = False
    
    for line_num, line in enumerate(lines, 1):
        stripped = line.strip()
        
        if not stripped or stripped.startswith("#"):
            continue
        
        if stripped.upper().startswith("FROM"):
            has_from = True
            from_value = stripped[4:].strip()
            if not from_value:
                errors.append(f"Line {line_num}: FROM instruction requires a model name")
        
        found = False
        for instruction in MODELFILE_INSTRUCTIONS:
            if stripped.upper().startswith(instruction):
                found = True
                break
        
        if not found and not line.startswith(" ") and not line.startswith("\t"):
            if stripped.startswith('"""') or stripped.endswith('"""'):
                continue
            words = stripped.split()
            if words and words[0].isupper():
                warnings.append(f"Line {line_num}: Unknown instruction '{words[0]}'")
    
    if not has_from:
        errors.append("Missing required FROM instruction")
    
    return len(errors) == 0, errors, warnings


def format_modelfile(content: str) -> str:
    parsed = parse_modelfile(content)
    formatted_lines = []
    
    if parsed["base_model"]:
        formatted_lines.append(f"FROM {parsed['base_model']}")
        formatted_lines.append("")
    
    for param_name, param_value in parsed["parameters"].items():
        formatted_lines.append(f"PARAMETER {param_name} {param_value}")
    
    if parsed["parameters"]:
        formatted_lines.append("")
    
    if parsed["system"]:
        if "\n" in parsed["system"]:
            formatted_lines.append(f'SYSTEM """')
            formatted_lines.append(parsed["system"])
            formatted_lines.append('"""')
        else:
            formatted_lines.append(f"SYSTEM {parsed['system']}")
        formatted_lines.append("")
    
    if parsed["template"]:
        if "\n" in parsed["template"]:
            formatted_lines.append(f'TEMPLATE """')
            formatted_lines.append(parsed["template"])
            formatted_lines.append('"""')
        else:
            formatted_lines.append(f"TEMPLATE {parsed['template']}")
        formatted_lines.append("")
    
    if parsed["adapter"]:
        formatted_lines.append(f"ADAPTER {parsed['adapter']}")
        formatted_lines.append("")
    
    if parsed["license"]:
        if "\n" in parsed["license"]:
            formatted_lines.append(f'LICENSE """')
            formatted_lines.append(parsed["license"])
            formatted_lines.append('"""')
        else:
            formatted_lines.append(f"LICENSE {parsed['license']}")
        formatted_lines.append("")
    
    for msg in parsed["messages"]:
        formatted_lines.append(f"MESSAGE {msg['role']} {msg['content']}")
    
    return "\n".join(formatted_lines).strip()


@router.post("/validate")
async def validate_modelfile_endpoint(
    request: ModelfileValidateRequest,
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        valid, errors, warnings = validate_modelfile(request.content)
        parsed = parse_modelfile(request.content) if valid else None
        
        return APIResponse(
            success=True,
            message="Validation completed",
            data={
                "valid": valid,
                "errors": errors,
                "warnings": warnings,
                "parsed": parsed
            }
        )
        
    except Exception as e:
        await logging_service.error(f"Failed to validate modelfile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/format")
async def format_modelfile_endpoint(
    request: ModelfileFormatRequest,
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        formatted = format_modelfile(request.content)
        
        return APIResponse(
            success=True,
            message="Modelfile formatted",
            data={
                "original": request.content,
                "formatted": formatted
            }
        )
        
    except Exception as e:
        await logging_service.error(f"Failed to format modelfile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/preview")
async def preview_modelfile(
    request: ModelfilePreviewRequest,
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        valid, errors, warnings = validate_modelfile(request.content)
        
        if not valid:
            return APIResponse(
                success=False,
                message="Invalid modelfile",
                data={
                    "valid": False,
                    "errors": errors
                }
            )
        
        parsed = parse_modelfile(request.content)
        
        preview = {
            "base_model": parsed["base_model"],
            "will_create": {
                "system_prompt": parsed["system"] is not None,
                "custom_template": parsed["template"] is not None,
                "custom_parameters": len(parsed["parameters"]) > 0,
                "lora_adapter": parsed["adapter"] is not None,
                "example_messages": len(parsed["messages"])
            },
            "parameters": parsed["parameters"],
            "estimated_behavior": []
        }
        
        if parsed["system"]:
            preview["estimated_behavior"].append(
                f"Model will use custom system prompt ({len(parsed['system'])} chars)"
            )
        
        if parsed["template"]:
            preview["estimated_behavior"].append("Model will use custom prompt template")
        
        if "temperature" in parsed["parameters"]:
            temp = parsed["parameters"]["temperature"]
            if temp > 0.8:
                preview["estimated_behavior"].append("Higher creativity due to high temperature")
            elif temp < 0.3:
                preview["estimated_behavior"].append("More deterministic outputs due to low temperature")
        
        if parsed["adapter"]:
            preview["estimated_behavior"].append("Model will be fine-tuned with LoRA adapter")
        
        return APIResponse(
            success=True,
            message="Modelfile preview",
            data=preview
        )
        
    except Exception as e:
        await logging_service.error(f"Failed to preview modelfile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
