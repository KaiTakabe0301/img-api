// GraphQLクエリをテストするためのスクリプト
import fetch from "node-fetch";

// サーバーのURL
const API_URL = "http://localhost:3000/graphql";

// ユーザー登録のミューテーション
const signupMutation = `
mutation Signup($signupInput: SignupInput!) {
  signup(signupInput: $signupInput) {
    token
  }
}
`;

// ログインのミューテーション
const loginMutation = `
mutation Login($loginInput: LoginInput!) {
  login(loginInput: $loginInput) {
    token
  }
}
`;

// 認証が必要なme クエリ
const meQuery = `
query Me {
  me {
    id
    email
    name
  }
}
`;

// ユーザー登録を実行する関数
async function signup(email, password, name) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: signupMutation,
        variables: {
          signupInput: {
            email,
            password,
            name,
          },
        },
      }),
    });

    const result = await response.json();
    console.log("Signup result:", JSON.stringify(result, null, 2));
    return result.data?.signup?.token;
  } catch (error) {
    console.error("Signup error:", error);
    return null;
  }
}

// ログインを実行する関数
async function login(email, password) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: loginMutation,
        variables: {
          loginInput: {
            email,
            password,
          },
        },
      }),
    });

    const result = await response.json();
    console.log("Login result:", JSON.stringify(result, null, 2));
    return result.data?.login?.token;
  } catch (error) {
    console.error("Login error:", error);
    return null;
  }
}

// 認証が必要なmeクエリを実行する関数
async function fetchMe(token) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: meQuery,
      }),
    });

    const result = await response.json();
    console.log("Me query result:", JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error("Me query error:", error);
    return null;
  }
}

// 認証なしでmeクエリを実行する関数（エラーになることを確認）
async function fetchMeWithoutAuth() {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: meQuery,
      }),
    });

    const result = await response.json();
    console.log(
      "Me query without auth result:",
      JSON.stringify(result, null, 2)
    );
    return result;
  } catch (error) {
    console.error("Me query without auth error:", error);
    return null;
  }
}

// テストを実行する関数
async function runTests() {
  console.log("=== 認証テスト開始 ===");

  // 1. 認証なしでmeクエリを実行（エラーになることを確認）
  console.log("\n1. 認証なしでmeクエリを実行:");
  await fetchMeWithoutAuth();

  // 2. ユーザー登録
  console.log("\n2. ユーザー登録:");
  const email = `test${Date.now()}@example.com`; // ユニークなメールアドレス
  const password = "password123";
  const name = "Test User";
  const signupToken = await signup(email, password, name);

  if (!signupToken) {
    console.error("ユーザー登録に失敗しました。テストを中止します。");
    return;
  }

  // 3. 登録したユーザーでmeクエリを実行
  console.log("\n3. 登録したユーザーでmeクエリを実行:");
  await fetchMe(signupToken);

  // 4. ログイン
  console.log("\n4. ログイン:");
  const loginToken = await login(email, password);

  if (!loginToken) {
    console.error("ログインに失敗しました。テストを中止します。");
    return;
  }

  // 5. ログインしたユーザーでmeクエリを実行
  console.log("\n5. ログインしたユーザーでmeクエリを実行:");
  await fetchMe(loginToken);

  // 6. 無効なトークンでmeクエリを実行
  console.log("\n6. 無効なトークンでmeクエリを実行:");
  await fetchMe("invalid-token");

  console.log("\n=== 認証テスト完了 ===");
}

// テストを実行
runTests();
