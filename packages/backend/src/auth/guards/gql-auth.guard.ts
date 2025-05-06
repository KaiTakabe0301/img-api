import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;

    // Authorization ヘッダーが存在するか確認
    if (!req.headers.authorization) {
      throw new UnauthorizedException('認証トークンが見つかりません。ログインしてください。');
    }

    return req;
  }

  handleRequest(err: any, user: any, info: any) {
    // エラーがある場合や、ユーザーが見つからない場合
    if (err || !user) {
      throw err || new UnauthorizedException('認証に失敗しました。再度ログインしてください。');
    }
    return user;
  }
}
