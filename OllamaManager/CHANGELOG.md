# Changelog
All notable changes to this project will be documented in this file.
## [Unreleased]
### Added
- **Test Suite**: Comprehensive testing framework using `pytest` and `FastAPI TestClient`.
  - Unit tests for `Modelfile` parsing logic.
  - Integration tests for core API endpoints (Root, Health, Auth, Modelfile).
  - Mocking support for Ollama service interactions.
- **Enhanced Health Check**: New `/system/health` endpoint providing detailed status of both the API and the connected Ollama server, along with real-time resource usage.
### Changed
- **Modelfile Parser**: Improved robustness of the parser to correctly handle inline comments (`#`) and complex multiline instructions.
- **Security**: Hardened default `SECRET_KEY` configuration to ensure a minimum security baseline in development environments.
### Fixed
- **Modelfile Validation**: Corrected edge cases where valid Modelfiles with comments were being flagged as invalid.
- **Resource Monitoring**: Optimized system resource data aggregation in the health service.
