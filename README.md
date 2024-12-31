# Merge Gatekeeper

人やチームによって重みを付けられるApprove数チェッカーです。

## プロジェクトに貢献したいと考えている方へ

このリポジトリは主にVOICEVOX内部での利用を想定しています。
そのため、大きな機能追加は受け付けていませんが、バグ報告や小さな改善は歓迎します。

## 使い方

以下のようなWorkflowを作成してください：

```yaml
name: Merge Gatekeeper
on:
  pull_request_target:
    types: [auto_merge_enabled]
  merge_group:
    types: [checks_requested]

jobs:
  merge_gatekeeper:
    runs-on: ubuntu-latest
    steps:
      - uses: voicevox/merge-gatekeeper@main
        with:
          # GitHubのトークン。
          # チームを指定する時に必要です。
          # OrgnizationのMember権限が必要です。
          token: ${{ secrets.GATEKEEPER_TOKEN }}

          # 失敗時の挙動。
          # fail: Workflowを失敗させる。（デフォルト）
          # none: 何もしない。独自の条件を作りたい時に使います。
          #       outputs.scoreにスコア、outputs.resultに結果（true/false）が入ります。
          on_fail: fail

          # マージに必要なスコア。
          required_score: 2

          # ユーザー/チームとスコアの関連付け。
          score_rules: |
            // チームの場合は#から始めてください。
            #maintainer: 2
            #reviewer: 1
            // ユーザーの場合は@から始めてください。
            @sevenc-nanashi: 2
            // それ以外の行は無視されます。
```

その後、Githubリポジトリで以下の設定を行ってください。

* Allow auto-mergeをONにする
* Rulesetを作成し、
  * Require status checks to passに`merge_gatekeeper`を追加する
  * Require merge queueをONにする

RulesetはこのリポジトリのものをExportしてImportすると簡単に設定できます。

## 注意点

- Review when Readyボタンを押した人もApproveしたものとしてカウントされます。
- チーム、ユーザー両方でスコアが指定されている場合は、ユーザーの方が優先されます。
- 2つ以上のチームに所属している場合は、score_rulesで上に書かれている方が優先されます。

## コマンド

```bash
# インストール
pnpm install

# ビルド
pnpm run build
# ビルドがされているかのチェック
pnpm run build:check

# フォーマットの確認やテストの実行
pnpm run check
```

## ライセンス

MIT Licenseで公開しています。
