(function(root){
  function plainTitle(name){
    return String(name || '').replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]*>/g, '').trim();
  }

  function getCaseView(projects, others, id){
    const index = projects.findIndex(project => project.id === id);
    if(index >= 0){
      const project = projects[index];
      return {
        id,
        title: plainTitle(project.name),
        desc: project.desc,
        gallery: project.gallery || [],
        previous: projects[(index - 1 + projects.length) % projects.length],
        next: projects[(index + 1) % projects.length],
      };
    }
    const other = others.find(project => project.id === id);
    if(!other) return null;
    return {
      id,
      title: other.title,
      desc: other.desc || '项目详情图片待补充。',
      gallery: other.gallery || [{src:`assets/${other.cover}.jpg`,alt:`${other.title}当前封面图`}],
      previous: null,
      next: null,
    };
  }

  function renderGallery(doc, container, gallery){
    if(!gallery?.length){
      const empty = doc.createElement('div');
      empty.className = 'case-gallery-empty';
      empty.textContent = '项目图片待补充';
      container.replaceChildren(empty);
      return;
    }
    const figures = gallery.map((image, index) => {
      const figure = doc.createElement('figure');
      figure.className = 'case-image';
      const img = doc.createElement('img');
      img.alt = image.alt;
      if(image.width) img.width = image.width;
      if(image.height) img.height = image.height;
      img.loading = index === 0 ? 'eager' : 'lazy';
      img.decoding = 'async';
      const error = doc.createElement('div');
      error.className = 'case-image-error';
      error.textContent = '图片暂未加载成功，请稍后重试';
      error.hidden = true;
      img.addEventListener('error', () => {
        img.hidden = true;
        error.hidden = false;
        figure.classList.add('failed');
      });
      figure.append(img, error);
      img.src = image.src;
      return figure;
    });
    container.replaceChildren(...figures);
  }

  function renderCase(doc, elements, projects, others, id){
    const view = getCaseView(projects, others, id);
    if(!view) return null;
    elements.title.textContent = view.title;
    elements.desc.textContent = view.desc;
    renderGallery(doc, elements.gallery, view.gallery);
    return view;
  }

  function createController(options){
    const {
      document:doc, window:win, projects, others, background,
      overlay, sheet, title, desc, gallery,
      previous, next, previousName, nextName, closeButton, returnButton,
    } = options;
    let active = false;
    let currentId = null;
    let source = null;
    let savedScrollY = 0;
    let savedOverflow = '';
    let savedRootOverflow = '';
    let savedInert = [];

    function show(id){
      const view = renderCase(doc, {title,desc,gallery}, projects, others, id);
      if(!view) return false;
      currentId = id;
      previous.hidden = !view.previous;
      previous.disabled = !view.previous;
      previousName.textContent = view.previous ? plainTitle(view.previous.name) : '';
      next.hidden = !view.next;
      next.disabled = !view.next;
      nextName.textContent = view.next ? plainTitle(view.next.name) : '';
      sheet.scrollTop = 0;
      return true;
    }

    function open(id, trigger){
      if(!show(id)) return false;
      if(!active){
        source = trigger || doc.activeElement;
        savedScrollY = win.scrollY;
        savedOverflow = doc.body.style.overflow;
        savedRootOverflow = doc.documentElement.style.overflow || '';
        savedInert = background.map(element => !!element.inert);
        doc.body.style.overflow = 'hidden';
        doc.documentElement.style.overflow = 'hidden';
        background.forEach(element => { element.inert = true; });
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        active = true;
      }
      title.focus({preventScroll:true});
      return true;
    }

    function adjacent(direction){
      if(!active) return false;
      const view = getCaseView(projects, others, currentId);
      const target = direction < 0 ? view?.previous : view?.next;
      if(!target || !show(target.id)) return false;
      title.focus({preventScroll:true});
      return true;
    }

    function close(){
      if(!active) return false;
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      doc.body.style.overflow = savedOverflow;
      doc.documentElement.style.overflow = savedRootOverflow;
      background.forEach((element, index) => { element.inert = savedInert[index]; });
      if(source?.isConnected !== false) source?.focus({preventScroll:true});
      if(win.scrollY !== savedScrollY) win.scrollTo({top:savedScrollY,behavior:'instant'});
      active = false;
      currentId = null;
      source = null;
      return true;
    }

    function handleKeydown(event){
      if(!active) return;
      if(event.key === 'Escape'){
        event.preventDefault();
        close();
        return;
      }
      if(event.key !== 'Tab') return;
      const buttons = [closeButton,previous,returnButton,next].filter(button => !button.hidden && !button.disabled);
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if(event.shiftKey && (doc.activeElement === first || doc.activeElement === title)){
        event.preventDefault();
        last.focus();
      } else if(!event.shiftKey && (doc.activeElement === last || !buttons.includes(doc.activeElement))){
        event.preventDefault();
        first.focus();
      }
    }

    return {open, adjacent, close, handleKeydown};
  }

  root.CaseDetail = {getCaseView, renderGallery, renderCase, createController, plainTitle};
})(globalThis);
