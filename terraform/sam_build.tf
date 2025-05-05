# SAM で zip 作成
resource "null_resource" "sam_build" {
  # Always run the SAM build when terraform apply is executed
  triggers = {
    src_hash = filesha256("${path.module}/../sam/src/handler.ts")
  }

  provisioner "local-exec" {
    command = "cd ../sam && pnpm build && sam build --use-container"
  }
}

data "archive_file" "lambda_zip" {
  depends_on     = [null_resource.sam_build]
  type           = "zip"
  source_dir     = "../sam/.aws-sam/build/ImageHandlerFunction"
  output_path    = "../sam/.aws-sam/build/image-handler.zip"
}
