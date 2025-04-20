variable "env" {
  description = "Environment name: local | ci | prod"
  type        = string
  default     = "local"
}

variable "use_localstack" {
  description = "true = LocalStack / false = real AWS"
  type        = bool
  default     = true         # CI・prod では -var='use_localstack=false'
}

variable "region" {
  description = "AWS region when not using LocalStack"
  type        = string
  default     = "us-east-1"
}