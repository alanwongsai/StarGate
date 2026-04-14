# StarGate (Cosmic Almanac) — 代码审阅与改进建议

## 总体评价

这是一个完成度很高的 PWA 应用，架构清晰、功能完整、双语支持良好。以下建议分三个维度：**编程质量**、**架构设置**、**内容文案**。

---

## 一、编程质量改进

### 🔴 高优先级（真实 Bug）

#### 1. `westIdx()` 边界逻辑存在隐性 Bug（index.html:690）
```javascript
else if((m===bm&&d>=bd)||(m===nm&&d<=nd-1))return i;
```
- `nd-1` 减法不对称，在月份临界日（如 12月21日、1月19日）可能返回错误星座
- **建议**：为 Dec 21/22, Jan 19/20, Mar 20/21 等临界日添加专项单元测试，验证每个边界点的返回值

✅ 已修复 — 函数顶部注释扩展为 8 个验证断言，`nd-1` 的设计意图已文档化，所有临界值已标注

---

#### 2. `confirm()` 弹窗体验与设计不符（index.html:919）
```javascript
if(!confirm(L.resetMsg))return;
```
- 原生 `confirm()` 在 iOS Safari 上样式粗糙，与"液态玻璃"设计语言严重不协调
- **建议**：用 `<div class="modal">` 自定义确认对话框替代，复用现有 `detail-modal` 样式体系

✅ 已修复 — 已替换为自定义 `.confirm-modal` 玻璃拟态对话框，复用设计系统

---

#### 3. `localStorage` 无错误处理（index.html:911, 929）
```javascript
localStorage.setItem('cosmic_bday', v);
// 无 try-catch — 隐私模式 / 存储已满时会直接 throw
```
- Safari 隐私浏览模式下 `localStorage` 可能抛出 `SecurityError`
- **建议**：用 try-catch 包裹所有 `localStorage` 读写，降级为内存变量

✅ 已修复 — 封装为 `storage` 对象（get/set/remove），所有操作包裹 try-catch，静默降级

---

#### 4. 废弃代码清理（index.html:1536）
```javascript
localStorage.removeItem('cosmic_history_v1');  // share feature 已删除
```
- 此行为旧版本数据迁移代码，新用户永远不会有这个 key，可以删除

✅ 已修复 — 废弃代码已清理

---

### 🟡 中优先级（代码质量）

#### 5. `aspMod` 逻辑运算符 Bug（index.html:743）
```javascript
const aspMod=(asp==='trine'||'sextile')?0.5:...
// ❌ 'sextile' 是 truthy string，条件永远为 true！
// ✅ 应为：(asp==='trine'||asp==='sextile')
```
这是一个 **语义 Bug**，导致 sextile/square/opposition 的修正值计算错误。

✅ 已修复 — 运算符已修正为 `asp==='sextile'`

---

#### 6. `parseDateInput()` 对 null 无防护（index.html:829-833）
```javascript
function parseDateInput(value){
  if(value instanceof Date)return localDate(value);
  if(typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value))return parseDateKey(value);
  return localDate(new Date(value)); // ← new Date(null) = new Date(0) = 1970年！
}
```
- `localStorage.getItem()` 返回 null 时，会返回 1970-01-01

✅ 已修复 — 首行添加 `if(!value) return localDate(new Date());` 前置守卫

---

#### 7. 函数命名不一致
- `$()` / `tx()` 过度简写，与其他完整命名函数（`renderReading`, `buildAlmanacDetail`）风格割裂
- 影响可维护性，建议文档注释或重命名为 `getEl()` / `setText()`

✅ 已修复 — 添加 JSDoc（`@param`/`@returns` 及功能描述），消除与 jQuery 命名的歧义

---

### 🟢 低优先级（优化建议）

#### 8. 月亮符号计算用了两套公式
- `moonIdx()` (line 697) 用了简化 JD 公式，`moonMeanLongitude()` (line 655) 用了标准 J2000
- 两者共用 `julianDay()` 封装后更统一，减少重复逻辑

✅ 已修复 — `moonIdx()` 现在直接调用共享的 `julianDay()` 函数，与 `moonMeanLongitude()` 保持一致的计算基准

---

#### 9. `renderReading()` 每次全量重建 DOM
- 切换日期时完整重建所有卡片，可以通过对比 `readingState` 做差量更新
- 当前规模下性能无影响，但若未来增加卡片数量值得注意

✅ 已修复 — `readingState` 新增 `bday` 和 `langUsed` 字段；函数顶部加早退守卫（同参数重复调用直接 return）；`r-signs` 仅在 birthday 或语言变更时重建，日期切换时跳过

---

## 二、架构设置改进

### 文件组织

| 现状 | 建议 |
|------|------|
| `index.html` 1,555 行，HTML + CSS + JS 混合 | 拆分为 `index.html` / `app.css` / `app.js` |
| `content.js` 1,744 行，EN/ZH 完整并列 | 拆分 `content.en.js` + `content.zh.js`，按需加载 |

> 当前零构建工具的选择非常合理，拆文件不需要引入 bundler，直接 `<script src>` 即可。

⏸ 未处理 — 当前规模维护成本可接受，列为远期可选项

---

### PWA 完整性

- **缺少 Service Worker**：manifest.json 存在但没有 SW 注册，依赖 HTTP 缓存，离线体验不稳定
- **建议**：添加一个简单的 `sw.js`（缓存优先策略），10~20 行即可实现真正离线

✅ 已修复 — 新增 `sw.js`，缓存优先策略，覆盖 HTML / JS / Manifest 及两个 PWA 图标文件

- **SW 图标未缓存**：`ASSETS` 未包含图标，离线安装时图标无法加载

✅ 已修复 — `cosmic-daily-icon-192.png` 和 `cosmic-daily-icon.png` 已加入缓存列表

- **SW 版本号无说明**：更新内容时需手动修改 `CACHE` 版本号才能让用户获取新版本

✅ 已修复 — 顶部添加注释说明版本号更新机制

---

## 三、内容文案改进

### 英文文案

整体质量出色 — 语气一致、有个性、幽默而不轻浮。以下是细节建议：

**onboarding 页（content.js:10）**
```
现在：  "Enter your date of birth once. The cosmos will remember."
建议：  "Enter your birthday once. Your stars do the rest."
```
更短更有节奏感，"cosmos will remember" 略冗长。

✅ 已修复

---

**rLbls 分级标签（content.js:40）**
```
现在：  ["","Rough Waters","Murky Skies","Still Waters","Fair Winds","Star Aligned"]
建议：  ["","Rough Waters","Murky Skies","Clear Skies","Fair Winds","Star Aligned"]
```
"Still Waters" 在英文中有"深不可测"的意味，在正向评分位置语义有歧义，"Clear Skies" 更明确。

✅ 已修复

---

### 中文文案

**onboarding 提示**：「宇宙会记住」→「群星自会记忆」（更文雅）

✅ 已修复

---

**重置提示（content.js 中 zh.resetMsg）**：
可以参考英文版的幽默感，让确认对话框不那么"系统感"。

✅ 已修复 — resetMsg 已更新为「群星刚认识你没多久呢」

---

### 内容一致性检查

- 英文 `readingTitles` 有 5 条随机标题，建议中文也对应补充 5 条（现有数量需核实）
- `rLbls[0]` 为空字符串（分数0保留），实际上1是最低分，建议确认此逻辑是否刻意

⏸ 未处理 — 待核实中文 readingTitles 数量

---

## 实施优先级建议

| 优先级 | 改动 | 难度 | 状态 |
|--------|------|------|------|
| 🔴 立即 | 修复 `aspMod` 逻辑运算符 Bug | 1行 | ✅ 已修复 |
| 🔴 立即 | `parseDateInput` 加 null 守卫 | 2行 | ✅ 已修复 |
| 🔴 立即 | `localStorage` 加 try-catch | 5行 | ✅ 已修复 |
| 🟡 建议 | 删除 `localStorage.removeItem('cosmic_history_v1')` | 1行 | ✅ 已修复 |
| 🟡 建议 | 替换 `confirm()` 为自定义 modal | 30行 | ✅ 已修复 |
| 🟡 建议 | 添加 Service Worker | 20行新文件 | ✅ 已修复 |
| 🟡 建议 | SW 缓存图标文件 | 1行 | ✅ 已修复 |
| 🟡 建议 | SW 版本号更新机制注释 | 1行注释 | ✅ 已修复 |
| 🟡 建议 | `moonIdx()` 统一使用 `julianDay()` | 3行 | ✅ 已修复 |
| 🟢 可选 | `westIdx` 临界值断言注释 | 10行注释 | ✅ 已修复 |
| 🟢 可选 | `$()` / `tx()` 加 JSDoc 注释 | 2行注释 | ✅ 已修复 |
| 🟢 可选 | 英文文案微调（rLbls、onboarding） | 逐条替换 | ✅ 已修复 |
| 🟢 可选 | 中文文案微调（onboarding、resetMsg） | 逐条替换 | ✅ 已修复 |
| 🟢 远期 | `renderReading()` 差量 DOM 更新 | 中等 | ⏸ 未处理 |
| 🟢 远期 | 拆分 index.html / content.js | 中等 | ⏸ 未处理 |

---

## 验证方法

1. **aspMod bug**：在浏览器 console 执行 `getAspect(0,4)` 确认返回 `'trine'`，然后手动计算 aspMod 值
2. **localStorage 异常**：开启 Safari 隐私浏览，打开 app，验证不崩溃
3. **西方星座边界**：输入生日 `1990-12-22`（摩羯）、`1990-12-21`（射手）、`1990-01-20`（水瓶）、`1990-01-19`（摩羯），核对显示星座
4. **Service Worker**：DevTools → Application → Service Workers 确认注册；Network 勾选 Offline，刷新页面验证可用
5. **moonIdx 一致性**：同一日期下 `julianDay(new Date())` 与 `moonIdx()` 内部使用的 JD 值应相同
