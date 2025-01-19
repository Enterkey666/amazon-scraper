const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = 3000;

const scriptUrl = 'https://script.google.com/macros/s/AKfycbyGR1Vehe4Ae2QXd6IXQijiwDNFZvvCoKh8Ke-JCNaW0_Ysf4AZde7kikEVAa7zgn21/exec';

app.use(bodyParser.urlencoded({ extended: true }));

// フォームを表示するルート
app.get('/', (req, res) => {
  res.send(`
    <form action="/fetch" method="POST">
      <label for="url">Amazon商品のURL:</label><br>
      <input type="text" id="url" name="url" required style="width: 100%; padding: 10px;"><br><br>
      <button type="submit" style="padding: 10px 20px; font-size: 16px;">送信</button>
    </form>
  `);
});

// AmazonのURLを受け取ってデータを取得するルート
app.post('/fetch', async (req, res) => {
  const amazonUrl = req.body.url;

  try {
    const { data } = await axios.get(amazonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    const $ = cheerio.load(data);

    // 商品データの取得
    const productName = $('#productTitle').text().trim() || '商品名が見つかりません';
    const productImage = $('#landingImage').attr('src') || '画像が見つかりません';

    // 商品価格を取得
    let productPriceWhole = $('.a-price-whole').first().text().trim(); // 整数部分
    let productPriceFraction = $('.a-price-fraction').first().text().trim(); // 小数部分

    // 価格フォーマットの修正
    let productPrice = productPriceWhole.replace(/,/g, ''); // カンマを削除
    if (productPriceFraction) {
      productPrice += `.${productPriceFraction}`; // 小数部分を追加
    }

    productPrice = productPrice
      ? `¥${Number(productPrice).toLocaleString('ja-JP')}` // 数値としてフォーマット
      : '価格が見つかりません';

    // 商品説明
    const productDescription = $('#feature-bullets ul')
      .find('li')
      .map((i, el) => $(el).text().trim())
      .get()
      .join(' | ') || '説明が見つかりません';

    // サイズと重量を取得
    let productSize = 'サイズ情報が見つかりません';
    let productWeight = '重さ情報が見つかりません';
    $('#productDetails_techSpec_section_1, #productDetails_detailBullets_sections1')
      .find('tr')
      .each((i, el) => {
        const label = $(el).find('th').text().trim();
        const value = $(el).find('td').text().trim();

        if (label.includes('サイズ') || label.includes('寸法') || label.toLowerCase().includes('dimensions')) {
          productSize = value;
        } else if (label.includes('重量') || label.toLowerCase().includes('weight')) {
          productWeight = value;
        }
      });

    // Google Apps Scriptに送信
    await axios.get(scriptUrl, {
      params: {
        name: productName,
        url: amazonUrl,
        image: productImage,
        price: productPrice,
        description: productDescription,
        size: productSize,
        weight: productWeight,
      },
    });

    res.send(`
      <p>データがスプレッドシートに送信されました！</p>
      <p><a href="/">戻る</a></p>
    `);
  } catch (error) {
    res.status(500).send(`
      <p>エラーが発生しました: ${error.message}</p>
      <p><a href="/">戻る</a></p>
    `);
  }
});

app.listen(port, () => {
  console.log(`サーバーが起動しました: http://localhost:${port}`);
});
