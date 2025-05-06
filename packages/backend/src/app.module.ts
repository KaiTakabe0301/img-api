import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { join } from "path";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ImagesModule } from "./images/images.module";
import { UsersModule } from "./users/users.module";
import graphqlUploadExpress from "graphql-upload/graphqlUploadExpress.mjs";
import { MiddlewareConsumer, NestModule } from "@nestjs/common";
import { Request } from "express";
import { ConfigModule } from "@nestjs/config";
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from "@apollo/server/plugin/landingPage/default";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "prisma/.env"],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      autoSchemaFile: join(process.cwd(), "src/schema.gql"),
      context: ({ req }: { req: Request }) => ({ req }),
      csrfPrevention: false,
      driver: ApolloDriver,
      // graphqlのlanding pageを表示するための設定
      // graphql playgroundは非推奨なので、Apollo Sandboxを使用する
      // https://www.apollographql.com/docs/apollo-server/api/plugin/landing-pages
      playground: false,
      plugins: [
        process.env.NODE_ENV === "production"
          ? ApolloServerPluginLandingPageProductionDefault({
              graphRef: "my-graph-id@my-graph-variant",
              footer: false,
            })
          : ApolloServerPluginLandingPageLocalDefault({ footer: false }),
      ],
      sortSchema: true,
    }),
    PrismaModule,
    AuthModule,
    ImagesModule,
    UsersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }))
      .forRoutes("graphql");
  }
}
