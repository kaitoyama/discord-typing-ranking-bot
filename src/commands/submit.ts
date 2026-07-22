import { SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { createThread } from '../utils/thread';
import { analyze } from '../utils/analyze';
import { calculateScore, calculateAccuracy } from '../utils/score';
import { Submission } from '../entities/Submission';
import { AppDataSource } from '../config/typeorm.config';

export const data = new SlashCommandBuilder()
  .setName('submit')
  .setDescription('画像を投稿します')
  .addAttachmentOption(option =>
    option
      .setName('image')
      .setDescription('投稿する画像')
      .setRequired(true)
  );

// コメントデータ構造
const COMMENTS = {
  advanced: { // 150文字/分以上
    accuracy_97_98: [
      '焦らないように。ミスを減らせばスコアも伸びます。',
      '調子が悪いときは気分転換をしてみましょう。',
      'ミスをしそうになったら一度止まってみましょう。これだけで変わります。'
    ],
    accuracy_98_99: [
      '途中で緊張してしまうこともあると思います。音楽をかけるとリラックスできるかも。',
      '研究によると、手の動きに意識を向けないほうが良い動きになるようです。',
      '手に力が入ってしまっていませんか？一度力を抜いてみましょう'
    ],
    accuracy_99_999: [
      '良い調子！お風呂に入った直後は良い記録が出やすいらしいですよ。',
      '手のひらの力を抜き、指先に力を入れると打ちやすくなるかも？',
      'とても良い調子です！試行回数を重ねればもっと良いスコアが出るかも！'
    ],
    accuracy_100: [
      'ノーミスおめでとうございます。この感覚を忘れないで。',
      '0ミスおめでとうございます！さらなる速度を目指すのであれば「最適化」を行うのがおすすめ。気になった方は調べてみてください。',
      'ナイスノーミス！ですが腱鞘炎には気を付けて。手首と腕の角度を合わせると負担が少なくなります。'
    ]
  },
  intermediate: { // 100-150文字/分
    accuracy_97_98: [
      '焦らないように。ミスを減らせばスコアも伸びます。',
      'できる限りキーボードを見ないように！画面の文字をしっかり読みましょう！',
      'ミスをしそうになったら一度止まってみましょう。これだけで変わります。'
    ],
    accuracy_98_99: [
      'おすすめ練習法。パソコンで日記を書いたり、テキストチャットをすると上達します。',
      '腕をハの字に開いてみましょう。少し打ちやすくなります。',
      '手に力が入ってしまっていませんか？一度力を抜いてみましょう'
    ],
    accuracy_99_999: [
      '良い調子！お風呂に入った直後は良い記録が出やすいらしいですよ。',
      '途中で緊張してしまうこともあると思います。音楽をかけるとリラックスできるかも。',
      'とても良い調子です！試行回数を重ねればもっと良いスコアが出るかも！'
    ],
    accuracy_100: [
      'ノーミスおめでとうございます。この感覚を忘れないで。',
      '0ミスおめでとうございます！ここから少しずつ速度をつけていきましょう！',
      '0ミス！すごい！滅多に出るものではないので、自分を褒めてあげてください！'
    ]
  },
  beginner: { // 100文字/分未満
    accuracy_97_98: [
      '焦らないように。ミスを減らせばスコアも伸びます。',
      'ホームポジションは意識できていますか？指の役割分担ができていると安定します。',
      'できる限りキーボードを見ないように！画面の文字をしっかり読みましょう！'
    ],
    accuracy_98_99: [
      '手に力が入ってしまっていませんか？一度力を抜いてみましょう',
      '腕をハの字に開いてみましょう。少し打ちやすくなります。',
      '速さにこだわりすぎないように。正確に打つことがスコアにも速度にも繋がります'
    ],
    accuracy_99_999: [
      '良い調子。集中すればするほど目に疲れが溜まっていきます。一度目を閉じてリラックスしてみましょう。',
      '通常のホームポジションと違う打ち方をしていても大丈夫。自分が慣れている方法が1番です。',
      'とても良い調子です！試行回数を重ねればもっと良いスコアが出るかも！'
    ],
    accuracy_100: [
      'ノーミスおめでとうございます。この感覚を忘れないで。',
      '0ミスおめでとうございます！ここから少しずつ速度をつけていきましょう！',
      '0ミス！すごい！滅多に出るものではないので、自分を褒めてあげてください！'
    ]
  }
};

// レベル判定とコメント選択関数
function getRandomComment(speed: number, accuracy: number): string {
  // レベル判定
  let levelComments;
  if (speed >= 150) {
    levelComments = COMMENTS.advanced;
  } else if (speed >= 100) {
    levelComments = COMMENTS.intermediate;
  } else {
    levelComments = COMMENTS.beginner;
  }

  // 正確性判定（97%以下も97-98の範囲を使用）
  let accuracyComments;
  if (accuracy >= 100) {
    accuracyComments = levelComments.accuracy_100;
  } else if (accuracy >= 99.9) {
    accuracyComments = levelComments.accuracy_99_999;
  } else if (accuracy >= 98) {
    accuracyComments = levelComments.accuracy_98_99;
  } else {
    // 97%以下でも97-98の範囲を使用
    accuracyComments = levelComments.accuracy_97_98;
  }

  // ランダムに選択
  const randomIndex = Math.floor(Math.random() * accuracyComments.length);
  return accuracyComments[randomIndex];
}

// 提出を締め切る場合はtrueにする
const SUBMIT_CLOSED: boolean = false;

export async function execute(interaction: ChatInputCommandInteraction) {
  if (SUBMIT_CLOSED) {
    await interaction.reply({
      content: '提出は締め切られました。',
      ephemeral: true
    });
    return;
  }

  const image = interaction.options.getAttachment('image', true);

  // 元のメッセージを送信
  await interaction.reply({
    files: [new AttachmentBuilder(image.url)],
    content: '画像が投稿されました！'
  });

  // スレッドを作成
  const thread = await createThread(interaction);

  try {
    // 画像分析を実行
    const result = await analyze(image.url);

    // 必須項目のチェック
    if (result.level == null ||
      result.charCount == null ||
      result.kpm == null ||
      result.mistypeCount == null ||
      result.continuousMistypeCount == null) {
      throw new Error('画像の分析に失敗しました。必要な情報が取得できませんでした。');
    }

    // スコア用正確率 (0-1) を計算
    const accuracy = calculateAccuracy(result.kpm, result.mistypeCount, result.continuousMistypeCount);

    // スコア計算
    const score = calculateScore(result.charCount, result.kpm, result.mistypeCount, result.continuousMistypeCount);

    // コメント取得 (KPMとスコア用正確率%を使用)
    const comment = getRandomComment(result.kpm, accuracy * 100);

    if (interaction.user.username === 'kaitoyama') {
      console.log('スコア:', score);
      console.log('レベル:', result.level);
      console.log('文字数:', result.charCount);
      console.log('KPM:', result.kpm);
      console.log('スコア用正確率:', (accuracy * 100).toFixed(2) + '%');
      console.log('ミスタイプ数:', result.mistypeCount);
      console.log('連続ミスタイプ数:', result.continuousMistypeCount);
      console.log('スレッドID:', thread.id);
      console.log('ユーザー名:', interaction.user.username);
      console.log('画像URL:', image.url);
      console.log('コメント:', comment);
    } else {
      if (result.level === 5) {
        // トランザクション開始
        await AppDataSource.manager.transaction(async transactionalEntityManager => {
          const submission = transactionalEntityManager.create(Submission, {
            userId: interaction.user.username,
            speed: result.kpm,
            accuracy: accuracy,
            miss: result.mistypeCount,
            continuousMiss: result.continuousMistypeCount,
            score: score,
            channelId: interaction.channelId
          });
          await transactionalEntityManager.save(submission);
        });
      }
    }

    // 成功時のEmbedメッセージを作成
    const successEmbed = new EmbedBuilder()
      .setColor(result.level === 5 ? 0x00FF00 : 0xFFA500)  // レベル5未満は橙色
      .setTitle('分析結果')
      .addFields(
        { name: 'レベル', value: `${result.level}`, inline: true },
        { name: '文字数', value: `${result.charCount}文字`, inline: true },
        { name: 'KPM', value: `${result.kpm}`, inline: true },
        { name: 'スコア用正確率', value: `${(accuracy * 100).toFixed(2)}%`, inline: true },
        { name: 'スコア', value: `${score}`, inline: true },
        { name: 'ミスタイプ数', value: `${result.mistypeCount}回`, inline: true },
        { name: '連続ミスタイプ数', value: `${result.continuousMistypeCount}回`, inline: true },
        { name: '💬 コメント', value: comment, inline: false }
      );

    if (result.level != 5) {
      successEmbed.addFields({
        name: '⚠️ 警告',
        value: 'レベル5でないとランキングに参加できません！',
        inline: false
      });
    }

    // スレッドに結果を送信
    await thread.send({ embeds: [successEmbed] });

  } catch (error) {
    // エラー時のEmbedメッセージを作成
    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('エラーが発生しました')
      .setDescription(error instanceof Error ? error.message : '不明なエラーが発生しました')
      .setTimestamp();

    // スレッドにエラーメッセージを送信
    await thread.send({ embeds: [errorEmbed] });
  }
}
