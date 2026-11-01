# ORBIT Quote Workspace

Bilingual product quotation workspace with 34 products and 72 initial plans. Prices are in CNY; empty VPN and IP pool prices remain pending.

- The nine catalog headers follow the supplied reference.
- Product groups expand into editable plan subtables.
- Text, numeric fields, dropdowns and multi-select tags are editable; custom columns support the same types.
- Add records to existing products or create products. Administrators can delete individual plans, selected plans, whole products or custom fields; deletion confirms the scope and can be undone. Custom fields can be renamed and their choices edited. Search and warranty filters remain available to all visitors.
- Click to select a cell; double-click or press Enter/F2 to edit text and prices. Dropdowns and tags open beside the cell. Enter confirms and moves down, Tab moves across, and Escape cancels. Arrow keys navigate selected cells.
- Copy or paste cells, including tab-separated ranges from a spreadsheet. Range paste validates every value before applying it. Drag header edges to resize columns.
- Edits save automatically after a short pause. Undo/redo restores up to 40 changes and saves the restored result. **Save now** retries failed saves. SQLite persists the catalog and the server update timestamp; revision checks protect simultaneous saves.
- Blue Ant Design theme plus light/dark themes, with no green accents. The compact header places the actual server update timestamp immediately before a prominent blue read-only badge; breadcrumbs and the large management title are removed. Table text is one size smaller; desktop summary cards are 68px high. Ant Design components power theme selection and product settings.
- Click the product image or settings icon to edit Chinese/English names and upload, replace or remove an image. PNG/JPG/WebP/GIF uploads are limited to 5 × 1024 × 1024 bytes by both client and server; the server validates the image signature and content type. Images persist in the local data directory while their keys and filenames persist with catalog metadata in SQLite.
- Uploaded and existing product images support drag/keyboard positioning, zoom, 90° rotation, square/4:3/16:9 crops and a live preview. Crops are bounded to 1024 pixels and saved as PNG; Use original preserves the source file, including GIF animation. Cancelling keeps the previous image.
- Option menus, keyboard editing, product settings and autosave status work in both languages. Visitors are read-only by default. Administrator sign-in unlocks editing, with server checks on catalog saves and image uploads. Sessions use HttpOnly, SameSite=Strict cookies (Secure on HTTPS), random session tokens stored as hashes in SQLite, an 8-hour expiry and immediate logout revocation. Password verification uses a salted PBKDF2 hash in the environment variable ORBIT_ADMIN_PASSWORD_HASH; ORBIT_ADMIN_USERNAME is configured separately. Failed sign-in attempts are throttled; origin checks protect write operations. Administrator credentials are never bundled into the public source or releases.
- The workspace focuses on the product catalog and per-product CNY/USD/MNT price tables. Quote creation, its navigation, selection toolbar, quantity/currency workflow and quote download have been removed. Catalog CSV export remains available. The sidebar starts with a smooth Three.js pelican riding a bicycle, with pedalling feet, spinning spokes, a moving neck and blinking eyes; there is no logo title or workspace card. The animation respects reduced-motion preferences.
- ExchangeRate-API reference rates are cached for one minute, queried every minute while open, and display their actual provider timestamp. The free source updates daily. Cached fallback is explicitly labeled; no invented fallback rates are used.
- Three.js orbital geometry, interactive Canvas connections and animated gradients remain, along with the pelican bicycle animation at the top of the sidebar. The motorcycle game has been removed. The workspace fits the browser viewport; only the catalog and long category lists scroll independently. Short windows use a compact layout so table controls stay accessible. Backgrounds respect reduced-motion preferences.

## 阿里云 / Linux 部署

此仓库运行标准 Next.js，使用 SQLite 保存表格、汇率缓存和登录会话，产品图片保存到本地磁盘。无需 Cloudflare D1 / R2。首次启动使用源码中的 34 个产品、72 个套餐；原 Sites 实例的数据不会自动迁移。

需要 Linux x86_64、systemd 和 Node 24。小内存服务器使用 GitHub Actions 构建好的包，无需在服务器编译。

1. 在 Actions 中运行 **Linux server release**。构建会验证登录、只读权限、保存版本冲突和图片上传，然后发布带 SHA256 校验的 `server-<commit>` Release。
2. 下载 Release 中的 `deploy-server.sh`，检查后以 root 运行：

   ```bash
   bash deploy-server.sh server-<12位commit> 3210 http://服务器公网IP:3210
   ```

3. 首次安装后，通过服务器的安全终端把已有管理员配置加入 `/etc/orbit-quote-desk.env`：

   ```text
   ORBIT_ADMIN_USERNAME=你的管理员账号
   ORBIT_ADMIN_PASSWORD_HASH='{已有PBKDF2配置JSON}'
   ```

   哈希配置格式是 `{"salt":"48位小写十六进制","hash":"64位小写十六进制"}`，使用 PBKDF2-SHA256 / 100000 次 / 32 字节。不要把明文密码或哈希写入 GitHub。配置文件权限为 600。未配置时页面可查看，但管理员登录关闭。

4. `systemctl restart orbit-quote-desk`，确认服务运行后，仅放行所选应用端口并验证公网地址。如使用 HTTPS 反向代理，将 `ORBIT_PUBLIC_ORIGIN` 设置为完整 HTTPS 域名。

安装脚本仅创建独立运行目录 `/opt/orbit-quote-desk`、数据目录 `/var/lib/orbit-quote-desk`、配置文件和 `orbit-quote-desk.service`，不会修改现有 Nginx、宝塔或防火墙。服务用无登录权限的 `orbitquote` 用户运行，开机启动，失败自动重启。升级保留配置和数据；新版本本地健康检查失败时回退旧版本。

备份时保存 `/var/lib/orbit-quote-desk` 和 `/etc/orbit-quote-desk.env`；SQLite 正在运行时请使用其在线备份机制，或停止本服务后复制整个数据目录。

## 本地开发与验证

```bash
npm ci
npm run dev -- --port 5174
npm run build:server
cp -R public .next/standalone/public
cp -R .next/static .next/standalone/.next/static
PORT=3210 HOSTNAME=127.0.0.1 npm run start:server
```

使用 Node 24，管理员配置通过环境变量注入，`ORBIT_DATA_DIR` 默认是 `data/`。`ORBIT_PUBLIC_ORIGIN` 可显式设置，未设置时检查请求 Host 与 Origin。

`scripts/check-server.mjs` 验证服务 API，仅在隔离的测试数据目录运行，因为它会保存表格并上传测试图片。设置测试用户名、哈希和 `ORBIT_TEST_PASSWORD` 后运行 `node scripts/check-server.mjs`；Actions 自动创建随机测试配置。

产品数据：`lib/catalog.ts`；界面：`app/page.tsx`；样式：`app/globals.css`；动画：`app/Atmosphere.tsx`；服务器存储：`lib/server-env.ts`。
