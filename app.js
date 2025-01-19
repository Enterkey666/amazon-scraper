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

    const productName = $('#productTitle').text().trim() || '商品名が見つかりません';
    const productImage = $('#landingImage').attr('src') || '画像が見つかりません';
    const productPrice = $('.a-price-whole').text().trim() || '価格が見つかりません';
    const productDescription = $('#feature-bullets ul')
      .find('li')
      .map((i, el) => $(el).text().trim())
      .get()
      .join('\n') || '説明が見つかりません';
    const productSize = $('#productDetails_techSpec_section_1')
      .find('th:contains("サイズ") + td')
      .text()
      .trim() || 'サイズ情報が見つかりません';
    const productWeight = $('#productDetails_techSpec_section_1')
      .find('th:contains("重量") + td')
      .text()
      .trim() || '重さ情報が見つかりません';

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

    res.send('データがスプレッドシートに送信されました！');
  } catch (error) {
    res.status(500).send('エラーが発生しました: ' + error.message);
  }
});

app.listen(port, () => {
  console.log(`サーバーが起動しました: http://localhost:${port}`);
});
