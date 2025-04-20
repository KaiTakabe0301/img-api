terraform {
  required_version = ">= 1.4"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region            = var.use_localstack ? "us-east-1" : var.region
  access_key        = var.use_localstack ? "test" : null
  secret_key        = var.use_localstack ? "test" : null
  s3_use_path_style = var.use_localstack

  dynamic "endpoints" {
    for_each = var.use_localstack ? toset([1]) : toset([])
    content {
      s3         = "http://localhost:4566"
      lambda     = "http://localhost:4566"
      apigateway = "http://localhost:4566"
      iam        = "http://localhost:4566"
      sts        = "http://localhost:4566"
      ecr        = "http://localhost:4566"
    }
  }
}