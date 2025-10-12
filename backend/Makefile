# Makefile for backend development and testing

.PHONY: help test test-unit test-integration test-watch lint format install clean

help:
	@echo "Available commands:"
	@echo "  install     Install dependencies"
	@echo "  test        Run all tests"
	@echo "  test-unit   Run unit tests only"
	@echo "  test-integration Run integration tests only"
	@echo "  test-watch  Run tests in watch mode"
	@echo "  lint        Run linting"
	@echo "  format      Format code"
	@echo "  clean       Clean up cache files"

install:
	pip install -r requirements.txt

test:
	pytest

test-unit:
	pytest tests/unit/ -m unit

test-integration:
	pytest tests/integration/ -m integration

test-watch:
	pytest --watch

lint:
	ruff check .

format:
	ruff format .

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .coverage htmlcov/
	rm -rf .pytest_cache/

# Run tests with coverage report
test-cov:
	pytest --cov=app --cov-report=html --cov-report=term-missing

# Run specific test file
test-file:
	@if [ -z "$(FILE)" ]; then echo "Usage: make test-file FILE=path/to/test_file.py"; exit 1; fi
	pytest $(FILE)

# Run tests on specific marker
test-mark:
	@if [ -z "$(MARK)" ]; then echo "Usage: make test-mark MARK=unit|integration|slow"; exit 1; fi
	pytest -m $(MARK)