import express, { Express } from "express";
import cors from "cors";
import { readFile } from "fs/promises";
import { Config, configSchema } from "./config.js";
import { configDotenv } from "dotenv";
import swaggerUi from "swagger-ui-express";
// @ts-ignore
import swaggerDocument from "../swagger-output.json" assert { type: "json" };
import GPTCrawlerCore from "./core.js";
import { PathLike } from "fs";

configDotenv();

const app: Express = express();
const port = Number(process.env.API_PORT) || 3000;
const hostname = process.env.API_HOST || "localhost";

app.use(cors());
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/", (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>GPT Crawler</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .form-group { margin: 20px 0; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .help { font-size: 12px; color: #666; margin-top: 5px; }
        .status { margin: 20px 0; padding: 10px; border-radius: 4px; display: none; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .loading { background: #d1ecf1; color: #0c5460; }
      </style>
    </head>
    <body>
      <h1>GPT Crawler</h1>
      <form id="crawlForm">
        <div class="form-group">
          <label for="url">起始 URL *</label>
          <input type="url" id="url" name="url" required placeholder="https://example.com">
          <div class="help">要爬取的起始网址，可以是普通页面或 sitemap.xml</div>
        </div>
        
        <div class="form-group">
          <label for="match">匹配模式 *</label>
          <input type="text" id="match" name="match" required placeholder="https://example.com/**">
          <div class="help">匹配要爬取的链接模式，例如: https://example.com/docs/**</div>
        </div>
        
        <div class="form-group">
          <label for="exclude">排除模式</label>
          <input type="text" id="exclude" name="exclude" placeholder="https://example.com/admin/**">
          <div class="help">排除不需要爬取的链接模式 (可选)</div>
        </div>
        
        <div class="form-group">
          <label for="selector">内容选择器</label>
          <input type="text" id="selector" name="selector" placeholder=".main-content">
          <div class="help">CSS 选择器，用于提取页面中的特定内容 (可选)</div>
        </div>
        
        <div class="form-group">
          <label for="maxPagesToCrawl">最大页面数 *</label>
          <input type="number" id="maxPagesToCrawl" name="maxPagesToCrawl" value="50" required min="1">
          <div class="help">限制爬取的页面总数</div>
        </div>
        
        <div class="form-group">
          <label for="outputFileName">输出文件名 *</label>
          <input type="text" id="outputFileName" name="outputFileName" value="docs.json" required>
          <div class="help">生成的 JSON 文件名称</div>
        </div>
        
        <button type="submit">开始爬取</button>
      </form>
      
      <div id="status" class="status"></div>
      
      <script>
        document.getElementById('crawlForm').addEventListener('submit', async function(e) {
          e.preventDefault();
          
          const statusDiv = document.getElementById('status');
          statusDiv.className = 'status loading';
          statusDiv.style.display = 'block';
          statusDiv.textContent = '正在爬取中，请稍候...';
          
          const formData = new FormData(e.target);
          const config = Object.fromEntries(formData.entries());
          
          config.maxPagesToCrawl = parseInt(config.maxPagesToCrawl);
          
          try {
            const response = await fetch('/crawl', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(config)
            });
            
            if (response.ok) {
              const data = await response.text();
              const blob = new Blob([data], { type: 'application/json' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.style.display = 'none';
              a.href = url;
              a.download = config.outputFileName;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              
              statusDiv.className = 'status success';
              statusDiv.textContent = '爬取完成！文件已自动下载。';
            } else {
              const error = await response.json();
              statusDiv.className = 'status error';
              statusDiv.textContent = '爬取失败: ' + (error.message || '未知错误');
            }
          } catch (error) {
            statusDiv.className = 'status error';
            statusDiv.textContent = '请求失败: ' + error.message;
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Define a POST route to accept config and run the crawler
app.post("/crawl", async (req, res) => {
  const config: Config = req.body;
  try {
    const validatedConfig = configSchema.parse(config);
    const crawler = new GPTCrawlerCore(validatedConfig);
    await crawler.crawl();
    const outputFileName: PathLike = await crawler.write();
    const outputFileContent = await readFile(outputFileName, "utf-8");
    res.contentType("application/json");
    return res.send(outputFileContent);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error occurred during crawling", error });
  }
});

app.listen(port, hostname, () => {
  console.log(`API server listening at http://${hostname}:${port}`);
});

export default app;
