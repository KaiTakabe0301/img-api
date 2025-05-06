import { Prisma } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { Image } from "../entities/image.entity";
import { User } from "../../users/entities/user.entity";

/**
 * Prisma が返した画像レコード（user を include したもの）を
 * GraphQL 用 Image DTO に変換するユーティリティ
 */
export function toImageDto(
  dbImage: Prisma.ImageGetPayload<{ include: { user: true } }>
): Image {
  // Image 自体を DTO に変換
  const imageDto = plainToInstance(Image, dbImage, {
    excludeExtraneousValues: true,
  });
  return imageDto;
}
