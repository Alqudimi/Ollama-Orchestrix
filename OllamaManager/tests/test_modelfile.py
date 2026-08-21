import pytest
from src.ollama_manager.routers.modelfile import parse_modelfile, validate_modelfile

def test_parse_basic_modelfile():
    content = """
    FROM llama3
    PARAMETER temperature 0.7
    SYSTEM You are a helpful assistant.
    """
    parsed = parse_modelfile(content)
    assert parsed["base_model"] == "llama3"
    assert parsed["parameters"]["temperature"] == 0.7
    assert parsed["system"] == "You are a helpful assistant."

def test_parse_multiline_system():
    content = '''
    FROM llama3
    SYSTEM """
    Line 1
    Line 2
    """
    '''
    parsed = parse_modelfile(content)
    assert "Line 1" in parsed["system"]
    assert "Line 2" in parsed["system"]

def test_parse_with_comments():
    # هذا الاختبار قد يفشل مع الكود الحالي إذا لم يتم التعامل مع التعليقات داخل الأسطر
    content = """
    FROM llama3 # base model
    PARAMETER temperature 0.8 # set temperature
    """
    parsed = parse_modelfile(content)
    assert parsed["base_model"] == "llama3"
    assert parsed["parameters"]["temperature"] == 0.8

def test_validate_modelfile():
    # اختبار التحقق
    valid, errors, warnings = validate_modelfile("FROM llama3")
    assert valid is True
    assert len(errors) == 0
    
    valid, errors, warnings = validate_modelfile("PARAMETER temp 0.5")
    assert valid is False
    assert "Missing required FROM instruction" in errors
