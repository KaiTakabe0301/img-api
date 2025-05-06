import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { json, urlencoded } from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation
  app.useGlobalPipes(new ValidationPipe());

  // Enable CORS
  app.enableCors();

  // リクエストボディの最大サイズを増やす（例：50MB）
  app.use(json({ limit: "50mb" }));

  // GraphQLのアップロードにも対応するため
  app.use(urlencoded({ extended: true, limit: "50mb" }));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`GraphQL Playground: http://localhost:${port}/graphql`);
}
bootstrap();
