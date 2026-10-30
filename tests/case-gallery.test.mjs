import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const projectData = html.match(/const PROJECTS = \[([\s\S]*?)\];\s*const OTHERS =/);
assert.ok(projectData, '页面应包含精选项目数据');
const galleryHelper = html.match(/function projectGallery\([\s\S]*?\n}\n/);
const projects = runInNewContext(`${galleryHelper?.[0] || ''}\n([${projectData[1]}])`, {}, { timeout: 1000 });
const featuredProject = id => projects.find(project => project.id === id);
const otherData = html.match(/const OTHERS = \[([\s\S]*?)\];\s*const TOOLS_A\s*=/);
assert.ok(otherData, '页面应包含其他项目数据');
const others = runInNewContext(`([${otherData[1]}])`, {}, { timeout: 1000 });
await import('../case-detail.mjs').catch(() => {});
const detail = globalThis.CaseDetail;

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.listeners = {};
    this.classes = new Set();
    this.classList = {
      add: name => this.classes.add(name),
      remove: name => this.classes.delete(name),
      contains: name => this.classes.has(name),
    };
    this.style = {};
    this.attributes = {};
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  dispatch(type) { this.listeners[type]?.(); }
  setAttribute(name, value) { this.attributes[name] = value; }
  focus() { (this.ownerDocument || fakeDocument).activeElement = this; }
}
const fakeDocument = {
  createElement: tag => new FakeElement(tag),
  body: new FakeElement('body'),
  documentElement: new FakeElement('html'),
  activeElement: null,
};

test('精选项目封面保持原始 16:9 比例并保留悬停放大', () => {
  const frame = html.match(/\.project-image\{([^}]*)\}/)?.[1] || '';
  const image = html.match(/\.project-image img\{([^}]*)\}/)?.[1] || '';
  const hover = html.match(/\.project-card:hover \.project-image img\{([^}]*)\}/)?.[1] || '';
  assert.match(frame, /aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(image, /object-fit:\s*cover/);
  assert.match(hover, /transform:\s*scale\(1\.03\)/);
});

test('精选项目卡片不强制留白且按钮与右侧数据底部对齐', () => {
  const card = html.match(/\.project-card\{([^}]*)\}/)?.[1] || '';
  const copy = html.match(/\.project-copy\{([^}]*)\}/)?.[1] || '';
  const visual = html.match(/\.project-visual\{([^}]*)\}/)?.[1] || '';
  assert.doesNotMatch(card, /min-height:/);
  assert.match(copy, /justify-content:\s*space-between/);
  assert.match(visual, /justify-content:\s*space-between/);
});

test('三个精选项目按封面和编号顺序读取各自的本地图片', async () => {
  assert.deepEqual(Array.from(projects, project => project.id), ['lecai-ai','ai-agent','caiyun']);
  const expectedFiles = [
    ['lecai-ai', ['cover','01','02','03','04','05','06','07','08','09','10','11','12']],
    ['ai-agent', ['cover','01','02','03','04','05','06','07','08','09','10','11','12','13']],
    ['caiyun', ['cover','01','02','03','04','05','06','07','08','09','10','11','12']],
  ];
  for (const [id, files] of expectedFiles) {
    const project = featuredProject(id);
    assert.equal(project.cover, `project-images/${id}/cover`);
    assert.ok(Array.isArray(project.gallery) && project.gallery.length > 0, `${project.id} 缺少详情图片`);
    const paths = Array.from(project.gallery, image => image.src);
    assert.deepEqual(paths, files.map(file => `assets/project-images/${id}/${file}.webp`));
    assert.equal(new Set(paths).size, paths.length, `${project.id} 重复了同一张图片`);
    for (const image of project.gallery) {
      assert.match(image.src, /^assets\/[\w/-]+\.(?:jpg|png|webp)$/);
      assert.ok(image.alt && !image.alt.includes('占位'), `${project.id} 图片缺少说明`);
      assert.ok(image.width > 0 && image.height > 0, `${project.id} 图片缺少尺寸`);
      const imageFile = new URL(`../${image.src}`, import.meta.url);
      assert.ok((await stat(imageFile)).size > 0, `${image.src} 不可读取`);
    }
  }
});

test('乐采百应卡片展示采购判定与选品比价成效', () => {
  assert.deepEqual(Array.from(featuredProject('lecai-ai').stats, item => Array.from(item)), [
    ['采购方式判定','秒级'],
    ['选品比价效率','提升30倍'],
  ]);
});

test('品牌体系项目卡片展示组件总数与团队提效', () => {
  assert.deepEqual(Array.from(featuredProject('ai-agent').stats, item => Array.from(item)), [
    ['组件总数','60+'],
    ['团队提效约','50%'],
  ]);
});

test('Dorami 移至其他项目后保留原有介绍和详情图片', () => {
  const dorami = others.find(project => project.id === 'dorami');
  assert.ok(dorami);
  assert.equal(dorami.title, '设计系统与工程化 Dorami 组件平台');
  const view = detail.getCaseView(projects, others, 'dorami');
  assert.match(view.desc, /60\+ 基础组件/);
  assert.equal(view.gallery[0].src, 'assets/case-dorami.jpg');
});

test('详情按指定顺序展示图片，首图优先加载并保留长图比例', () => {
  assert.equal(typeof detail?.renderGallery, 'function');
  const container = new FakeElement('div');
  detail.renderGallery(fakeDocument, container, featuredProject('ai-agent').gallery);
  const images = container.children.map(figure => figure.children[0]);
  assert.equal(images.length, 14);
  assert.equal(images[0].src, 'assets/project-images/ai-agent/cover.webp');
  assert.equal(images[1].src, 'assets/project-images/ai-agent/01.webp');
  assert.equal(images[13].src, 'assets/project-images/ai-agent/13.webp');
  assert.equal(images[0].loading, 'eager');
  assert.ok(images.slice(1).every(image => image.loading === 'lazy'));
  assert.equal(images[0].width, 3840);
  assert.equal(images[0].height, 2160);
  assert.equal(images[5].height, 9638);
});

test('一张图加载失败仅提示该图，快速切换后旧图错误不影响新项目', () => {
  assert.equal(typeof detail?.renderGallery, 'function');
  const container = new FakeElement('div');
  detail.renderGallery(fakeDocument, container, featuredProject('ai-agent').gallery);
  const oldFigure = container.children[0];
  const oldImage = oldFigure.children[0];
  oldImage.dispatch('error');
  assert.equal(oldImage.hidden, true);
  assert.equal(oldFigure.children[1].hidden, false);
  assert.equal(container.children[1].children[0].hidden, undefined);

  detail.renderGallery(fakeDocument, container, featuredProject('caiyun').gallery);
  oldImage.dispatch('error');
  assert.equal(container.children.length, 13);
  assert.equal(container.children[0].children[0].src, 'assets/project-images/caiyun/cover.webp');
  assert.equal(container.children[0].children[1].hidden, true);
});

test('图片在设置地址时立即失败也能显示错误提示', () => {
  const immediateErrorDocument = {
    createElement(tag){
      const element = new FakeElement(tag);
      if(tag === 'img') Object.defineProperty(element, 'src', {
        set(value){this.source = value; this.dispatch('error');},
      });
      return element;
    },
  };
  const container = new FakeElement('div');
  detail.renderGallery(immediateErrorDocument, container, [{src:'assets/missing.jpg',alt:'丢失的图片'}]);
  assert.equal(container.children[0].children[0].hidden, true);
  assert.equal(container.children[0].children[1].hidden, false);
});

test('渲染项目详情时同步更新标题、简介和对应图片', () => {
  assert.equal(typeof detail?.renderCase, 'function');
  const title = new FakeElement('h3');
  const desc = new FakeElement('p');
  const gallery = new FakeElement('div');
  const result = detail.renderCase(fakeDocument, {title, desc, gallery}, projects, [], 'ai-agent');
  assert.equal(result.title, '从「品牌体系」 到「AI 设计工程化」');
  assert.equal(title.textContent, result.title);
  assert.equal(desc.textContent, featuredProject('ai-agent').desc);
  assert.equal(gallery.children.length, 14);
  assert.equal(gallery.children[0].children[0].src, 'assets/project-images/ai-agent/cover.webp');
});

test('项目图片尚未提供时展示说明，不留下空白画廊', () => {
  const container = new FakeElement('div');
  detail.renderGallery(fakeDocument, container, []);
  assert.equal(container.children.length, 1);
  assert.equal(container.children[0].textContent, '项目图片待补充');
});

function makeController(){
  const doc = {
    createElement: tag => new FakeElement(tag),
    body: new FakeElement('body'),
    documentElement: new FakeElement('html'),
    activeElement: null,
  };
  const elements = Object.fromEntries(
    ['overlay','sheet','title','desc','gallery','previous','next','previousName','nextName','closeButton','returnButton']
      .map(name => { const element = new FakeElement(name); element.ownerDocument = doc; return [name, element]; }),
  );
  const background = [new FakeElement('header'),new FakeElement('main'),new FakeElement('footer')];
  const win = {scrollY:480, scrollTo({top}){this.scrollY = top;}};
  const controller = detail.createController({
    document:doc, window:win, projects, others:[], background, ...elements,
  });
  return {controller,elements,background,win,doc};
}

test('详情前后导航按精选项目顺序切换并回到顶部，首尾循环', () => {
  assert.equal(typeof detail?.createController, 'function');
  const {controller,elements} = makeController();
  const source = new FakeElement('button');
  controller.open('ai-agent', source);
  assert.equal(elements.previous.hidden, false);
  assert.equal(elements.previousName.textContent, '乐采百应 多 Agent 体验设计');
  assert.equal(elements.nextName.textContent, '采云学院 千万级平台体验重构');
  elements.sheet.scrollTop = 200;
  controller.adjacent(1);
  assert.equal(elements.title.textContent, '采云学院 千万级平台体验重构');
  assert.equal(elements.sheet.scrollTop, 0);
  assert.equal(elements.previousName.textContent, '从「品牌体系」 到「AI 设计工程化」');
  controller.open('ai-agent', source);
  assert.equal(controller.adjacent(-1), true);
  assert.equal(elements.title.textContent, '乐采百应 多 Agent 体验设计');
  controller.open('lecai-ai', source);
  assert.equal(elements.previousName.textContent, '采云学院 千万级平台体验重构');
  assert.equal(elements.next.hidden, false);
  assert.equal(elements.nextName.textContent, '从「品牌体系」 到「AI 设计工程化」');
  assert.equal(controller.adjacent(1), true);
  assert.equal(elements.title.textContent, '从「品牌体系」 到「AI 设计工程化」');
  controller.open('caiyun', source);
  assert.equal(elements.nextName.textContent, '乐采百应 多 Agent 体验设计');
});

test('返回列表恢复底层滚动与原按钮焦点，Esc 也可关闭', () => {
  assert.equal(typeof detail?.createController, 'function');
  const {controller,elements,background,win,doc} = makeController();
  const source = new FakeElement('button');
  source.ownerDocument = doc;
  doc.body.style.overflow = 'auto';
  controller.open('caiyun', source);
  assert.equal(doc.body.style.overflow, 'hidden');
  assert.equal(doc.documentElement.style.overflow, 'hidden');
  assert.ok(background.every(item => item.inert === true));
  assert.equal(elements.overlay.attributes['aria-hidden'], 'false');
  win.scrollY = 0;
  controller.close();
  assert.equal(doc.body.style.overflow, 'auto');
  assert.equal(doc.documentElement.style.overflow, '');
  assert.ok(background.every(item => item.inert === false));
  assert.equal(doc.activeElement, source);
  assert.equal(win.scrollY, 480);
  controller.open('caiyun', source);
  controller.handleKeydown({key:'Escape', preventDefault(){}});
  assert.equal(elements.overlay.attributes['aria-hidden'], 'true');
});

test('打开详情后 Tab 焦点保持在详情控件中', () => {
  const {controller,elements,doc} = makeController();
  controller.open('caiyun', new FakeElement('button'));
  const event = {key:'Tab',shiftKey:false,preventDefault(){this.prevented = true;}};
  controller.handleKeydown(event);
  assert.equal(doc.activeElement, elements.closeButton);
  elements.next.focus();
  controller.handleKeydown(event);
  assert.equal(doc.activeElement, elements.closeButton);
  event.shiftKey = true;
  controller.handleKeydown(event);
  assert.equal(doc.activeElement, elements.next);
});

test('页面上的项目按钮、下一项目和返回列表连接到同一详情弹层', () => {
  const section = html.match(/\/\* ===== 详情抽屉 ===== \*\/([\s\S]*?)\/\* ===== 微信弹层 ===== \*\//);
  assert.ok(section);
  const doc = {
    createElement: tag => new FakeElement(tag),
    body: new FakeElement('body'),
    documentElement: new FakeElement('html'),
    activeElement: null,
    listeners:{},
    addEventListener(type, callback){this.listeners[type] = callback;},
  };
  const nodes = new Map();
  for(const id of ['caseOverlay','caseTitle','caseDesc','caseGallery','casePrevious','caseNext','casePreviousName','caseNextName','caseCloseButton','caseBackToList']){
    const element = new FakeElement(id);
    element.ownerDocument = doc;
    nodes.set(id, element);
  }
  const sheet = new FakeElement('section');
  nodes.get('caseOverlay').querySelector = () => sheet;
  doc.getElementById = id => nodes.get(id);
  doc.querySelector = () => new FakeElement('background');
  const win = {scrollY:200,scrollTo({top}){this.scrollY=top;}};
  runInNewContext(section[1], {document:doc,window:win,PROJECTS:projects,OTHERS:[],globalThis:{CaseDetail:detail}});
  const click = (selector, caseId) => {
    const target = new FakeElement('button');
    target.ownerDocument = doc;
    target.dataset = {case:caseId};
    target.closest = queried => queried === selector ? target : null;
    doc.listeners.click({target});
    return target;
  };
  const source = click('.case-trigger', 'ai-agent');
  assert.equal(nodes.get('caseTitle').textContent, '从「品牌体系」 到「AI 设计工程化」');
  click('[data-case-next]');
  assert.equal(nodes.get('caseTitle').textContent, '采云学院 千万级平台体验重构');
  click('[data-case-close],[data-case-return]');
  assert.equal(nodes.get('caseOverlay').attributes['aria-hidden'], 'true');
  assert.equal(doc.activeElement, source);
});
