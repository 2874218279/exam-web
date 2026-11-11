const STORAGE_KEY = "degreeEnglishWrongIds";
const STATS_KEY = "degreeEnglishStats"; 
const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

let allQuestions = [];
let quizQuestions = [];
let currentIndex = 0;
let currentMode = "all"; 
let wrongIds = new Set(loadWrongIds());
let stats = loadStats();

let answersRecord = {}; 
let currentDirType = "词汇语法";
let isPassageExpanded = false; 
let currentPassage = ""; 
let currentMockScore = 0;

const els = {
  homeView: document.getElementById("homeView"),
  directoryView: document.getElementById("directoryView"),
  quizView: document.getElementById("quizView"),
  profileView: document.getElementById("profileView"),
  tabHome: document.getElementById("tabHome"),
  tabProfile: document.getElementById("tabProfile"),
  startMockBtn: document.getElementById("startMockBtn"),
  startFullBtn: document.getElementById("startFullBtn"),
  startDailyBtn: document.getElementById("startDailyBtn"),
  grammarTags: document.getElementById("grammarTags"),
  directoryList: document.getElementById("directoryList"),
  backFromDirBtn: document.getElementById("backFromDirBtn"),
  dirTypeTabs: document.getElementById("dirTypeTabs"),
  progressText: document.getElementById("progressText"),
  mockScoreText: document.getElementById("mockScoreText"),
  questionText: document.getElementById("questionText"),
  optionsBox: document.getElementById("optionsBox"),
  feedbackBox: document.getElementById("feedbackBox"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  nextPassageBtn: document.getElementById("nextPassageBtn"),
  openCardBtn: document.getElementById("openCardBtn"),
  cardModal: document.getElementById("cardModal"),
  closeCardBtn: document.getElementById("closeCardBtn"),
  cardGrid: document.getElementById("cardGrid"),
  submitQuizBtn: document.getElementById("submitQuizBtn"),
  backHomeBtn: document.getElementById("backHomeBtn"),
  statSessions: document.getElementById("statSessions"),
  statAccuracy: document.getElementById("statAccuracy"),
  statTotal: document.getElementById("statTotal"),
  statWrong: document.getElementById("statWrong"),
  profileWrongBtn: document.getElementById("profileWrongBtn"),
  historyBtn: document.getElementById("historyBtn"),
  vocabBtn: document.getElementById("vocabBtn")
};

function loadWrongIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw).map(String) : [];
  } catch (e) { return []; }
}
function saveWrongIds() { localStorage.setItem(STORAGE_KEY, JSON.stringify([...wrongIds])); }

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : { sessions: 0, total: 0, correct: 0 };
  } catch (e) { return { sessions: 0, total: 0, correct: 0 }; }
}
function saveStats() { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); }

function switchTab(tabName) {
  els.homeView.classList.add("hidden");
  els.directoryView.classList.add("hidden");
  els.quizView.classList.add("hidden");
  els.profileView.classList.add("hidden");

  els.tabHome.classList.remove("active");
  els.tabProfile.classList.remove("active");

  if (tabName === 'home') {
    els.homeView.classList.remove("hidden");
    els.tabHome.classList.add("active");
    document.querySelector('.tab-bar').classList.remove('hidden');
  } else if (tabName === 'directory') {
    els.directoryView.classList.remove("hidden");
    els.tabHome.classList.add("active");
    document.querySelector('.tab-bar').classList.remove('hidden');
    renderDirectory();
  } else if (tabName === 'profile') {
    els.profileView.classList.remove("hidden");
    els.tabProfile.classList.add("active");
    document.querySelector('.tab-bar').classList.remove('hidden');
    updateProfileUI();
  } else if (tabName === 'quiz') {
    els.quizView.classList.remove("hidden");
    document.querySelector('.tab-bar').classList.add('hidden'); 
  }
}

function exitQuiz() { switchTab('home'); }

async function loadQuestions() {
  try {
    const res = await fetch("questions.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`无法读取 questions.json`);
    const data = await res.json();
    
    allQuestions = data.filter(q => q.id && q.question).map(q => ({
      ...q,
      id: String(q.id),
      answer: typeof q.answer === 'number' ? Number(q.answer) : q.answer
    }));

    renderGrammarTags();
    els.startFullBtn.disabled = allQuestions.length === 0;
    els.startDailyBtn.disabled = allQuestions.length === 0;
    els.startMockBtn.disabled = allQuestions.length === 0;
  } catch (err) {
    console.error(err);
    alert("题库加载失败，请检查 questions.json 格式");
  }
}

function renderGrammarTags() {
  const tagMap = {};
  allQuestions.forEach(q => {
    if (q.grammar && q.type) {
      if (!tagMap[q.type]) tagMap[q.type] = new Set();
      tagMap[q.type].add(q.grammar);
    }
  });

  if (Object.keys(tagMap).length === 0) return;
  
  els.grammarTags.innerHTML = "";
  
  for (const type in tagMap) {
    const title = document.createElement("div");
    title.style.width = "100%";
    title.style.fontSize = "14px";
    title.style.color = "#64748b";
    title.style.margin = "12px 0 6px 0";
    title.textContent = `【${type}】`;
    els.grammarTags.appendChild(title);

    tagMap[type].forEach(tag => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = tag;
      span.onclick = () => startQuiz('grammar', tag);
      els.grammarTags.appendChild(span);
    });
  }
}

function renderDirectory() {
  const filteredQuestions = allQuestions.filter(q => q.type === currentDirType && q.year);
  const yearSet = new Set();
  filteredQuestions.forEach(q => { if (q.year) yearSet.add(q.year); });
  const years = Array.from(yearSet).sort((a, b) => b - a);

  if (years.length === 0) {
    els.directoryList.innerHTML = `<div class="card" style="text-align:center; color:#64748b;">当前题型下暂无带有“年份”标签的题目。</div>`;
    return;
  }

  let html = "";
  years.forEach(year => {
    html += `<div class="year-group">
               <h3 class="year-title">${year}年</h3>
               <div style="margin-bottom: 20px;">
                 <button class="month-btn" style="width: 100%; padding: 20px 0;" onclick="startQuiz('date', '${year}|', '${currentDirType}')">进入练习</button>
               </div>
             </div>`;
  });
  els.directoryList.innerHTML = html;
}

els.dirTypeTabs.addEventListener("click", (e) => {
  if (e.target.classList.contains("type-tab")) {
    document.querySelectorAll(".type-tab").forEach(btn => btn.classList.remove("active"));
    e.target.classList.add("active");
    currentDirType = e.target.dataset.type;
    renderDirectory();
  }
});

function updateProfileUI() {
  els.statSessions.textContent = stats.sessions;
  els.statTotal.textContent = stats.total;
  els.statWrong.textContent = allQuestions.filter(q => wrongIds.has(String(q.id))).length;
  const accuracy = stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100);
  els.statAccuracy.textContent = `${accuracy}%`;
}

function updateMockScoreUI() {
  if (currentMode === "mock") {
    els.mockScoreText.style.display = "block";
    els.mockScoreText.textContent = `当前得分：${currentMockScore} 分`;
  } else {
    els.mockScoreText.style.display = "none";
  }
}

function startQuiz(mode, filterValue = null, extraValue = null) {
  currentMode = mode;
  stats.sessions++;
  saveStats();

  if (mode === "all") {
    quizQuestions = [...allQuestions];
  } else if (mode === "wrong") {
    quizQuestions = allQuestions.filter(q => wrongIds.has(String(q.id)));
  } else if (mode === "daily") {
    quizQuestions = [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, 10);
  } else if (mode === "grammar") {
    quizQuestions = allQuestions.filter(q => q.grammar === filterValue);
  } else if (mode === "type") {
    quizQuestions = allQuestions.filter(q => q.type === filterValue);
  } else if (mode === "date") {
    const [selYear, selMonth] = filterValue.split("|");
    quizQuestions = allQuestions.filter(q => 
      String(q.year) === selYear && (!selMonth || q.month === selMonth) && (!extraValue || q.type === extraValue)
    );
  }

  if (quizQuestions.length === 0) {
    alert(mode === "wrong" ? "错题本是空的。" : "此分类下暂无题目！");
    return;
  }

  currentIndex = 0;
  answersRecord = {}; 
  currentPassage = ""; 
  isPassageExpanded = false;
  currentMockScore = 0;
  updateMockScoreUI();
  switchTab('quiz');
  renderQuestion();
}

// 全真模拟组卷
function startMockExam() {
  const years = [...new Set(allQuestions.map(q => q.year))].filter(Boolean).sort((a, b) => b - a);
  if (years.length === 0) return alert("暂无年份数据");

  const selectedYear = prompt(`请选择要生成模拟卷的年份（${years.join(' 或 ')}）`, years[0]);
  if (!years.includes(selectedYear)) return alert("无效的年份");

  const yearQs = allQuestions.filter(q => String(q.year) === String(selectedYear));
  if (yearQs.length === 0) return alert("该年份暂无题目");

  let mockQs = [];
  
  // 1. 词汇语法 30道 * 1分
  yearQs.filter(q => q.type === "词汇语法").sort(()=>0.5-Math.random()).slice(0, 30).forEach(q => mockQs.push({...q, score: 1}));

  // 2. 挑错 10道 * 1分
  yearQs.filter(q => q.type === "挑错").sort(()=>0.5-Math.random()).slice(0, 10).forEach(q => mockQs.push({...q, score: 1}));

  // 3. 完形填空 (随机1篇，最多20空) * 0.5分
  const clozeTitles = [...new Set(yearQs.filter(q => q.type === "完形填空" && q.title).map(q => q.title))];
  if (clozeTitles.length > 0) {
      const selTitle = clozeTitles[Math.floor(Math.random() * clozeTitles.length)];
      yearQs.filter(q => q.title === selTitle).slice(0, 20).forEach(q => mockQs.push({...q, score: 0.5}));
  }

  // 4. 阅读理解 (随机3篇) * 每题2分
  const readTitles = [...new Set(yearQs.filter(q => q.type === "阅读理解" && q.title).map(q => q.title))].sort(()=>0.5-Math.random()).slice(0, 3);
  readTitles.forEach(title => {
      yearQs.filter(q => q.title === title).forEach(q => mockQs.push({...q, score: 2}));
  });

  // 5. 翻译 (英5, 汉5) * 2分
  const transQs = yearQs.filter(q => q.type === "翻译");
  transQs.filter(q => !/[\u4e00-\u9fa5]/.test(q.question)).sort(()=>0.5-Math.random()).slice(0, 5).forEach(q => mockQs.push({...q, score: 2}));
  transQs.filter(q => /[\u4e00-\u9fa5]/.test(q.question)).sort(()=>0.5-Math.random()).slice(0, 5).forEach(q => mockQs.push({...q, score: 2}));

  // 按题型顺序排序
  const typeOrder = { "词汇语法": 1, "挑错": 2, "完形填空": 3, "阅读理解": 4, "翻译": 5 };
  mockQs.sort((a,b) => {
      if(typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
      if(a.title && b.title && a.title !== b.title) return a.title.localeCompare(b.title);
      return 0;
  });

  if (mockQs.length === 0) return alert("该年份题目不足以生成试卷");

  quizQuestions = mockQs;
  currentIndex = 0;
  answersRecord = {};
  currentPassage = "";
  isPassageExpanded = false;
  currentMode = "mock";
  currentMockScore = 0;
  
  stats.sessions++;
  saveStats();
  updateMockScoreUI();
  switchTab('quiz');
  renderQuestion();
}

window.togglePassage = function() {
  isPassageExpanded = !isPassageExpanded;
  const content = document.getElementById('passageContent');
  if (content) {
    content.classList.toggle('hidden', !isPassageExpanded);
  }
}

window.jumpToQuestion = function(idx) {
  currentIndex = idx;
  renderQuestion();
  setTimeout(() => {
    document.getElementById("optionsBox").scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 50);
}

function renderQuestion() {
  updateMockScoreUI();
  const q = quizQuestions[currentIndex];
  const record = answersRecord[currentIndex];

  const isPassageGroup = q.title && (q.type === "完形填空" || q.type === "阅读理解");

  if (isPassageGroup) {
    const samePassageQs = quizQuestions.filter(item => item.title === q.title);
    const indexInPassage = samePassageQs.findIndex(item => item.id === q.id) + 1;
    els.progressText.textContent = `第 ${indexInPassage} / ${samePassageQs.length} 题`;
    
    let nextPassageIndex = -1;
    for (let i = currentIndex + 1; i < quizQuestions.length; i++) {
      if (quizQuestions[i].title !== q.title) { nextPassageIndex = i; break; }
    }
    
    if (nextPassageIndex !== -1) {
      els.nextPassageBtn.classList.remove("hidden");
      els.nextPassageBtn.onclick = () => {
        currentIndex = nextPassageIndex;
        renderQuestion();
        window.scrollTo(0, 0);
      };
    } else {
      els.nextPassageBtn.classList.add("hidden");
    }
  } else {
    els.progressText.textContent = `第 ${currentIndex + 1} / ${quizQuestions.length} 题`;
    els.nextPassageBtn.classList.add("hidden");
  }

  let tagHtml = "";
  if (q.type === "翻译") {
    if (q.year) tagHtml += `${q.year}年`;
  } else {
    if (q.type) tagHtml += `【${q.type}】`;
    if (q.grammar && q.type !== "阅读理解" && q.type !== "完形填空") tagHtml += `[${q.grammar}] `;
    if (q.year) tagHtml += `${q.year}年 `;
  }
  
  // 如果是全真模拟，在标签里加上分值
  if (currentMode === "mock" && q.score) {
    tagHtml += `<span style="color:#ef4444; font-weight:bold; margin-left:8px;">(${q.score}分)</span>`;
  }

  let contentHtml = "";

  if (isPassageGroup) {
    let fullPassage = q.passage;
    if (!fullPassage || fullPassage === "同上") {
      const firstQ = allQuestions.find(item => item.title === q.title && item.passage && item.passage !== "同上");
      if (firstQ) fullPassage = firstQ.passage;
    }

    if (fullPassage) {
      if (q.type === "完形填空") {
        const groupQuestions = allQuestions.filter(item => item.title === q.title && item.type === "完形填空");
        fullPassage = fullPassage.replace(/___(\d+)___/g, (match, numStr) => {
          const num = parseInt(numStr);
          const targetQ = groupQuestions[num - 1]; 
          let qIndex = -1;
          if (targetQ) qIndex = quizQuestions.findIndex(qq => qq.id === targetQ.id);
          
          let statusClass = "";
          if (qIndex !== -1 && answersRecord[qIndex]) {
            statusClass = answersRecord[qIndex].isCorrect ? "blank-correct" : "blank-wrong";
          }
          let activeClass = qIndex === currentIndex ? "blank-active" : "";
          if (qIndex === -1) return match; 

          return `<span class="cloze-blank ${statusClass} ${activeClass}" onclick="jumpToQuestion(${qIndex})">${num}</span>`;
        });
      }
      
      contentHtml += `
        <div class="passage-container" style="max-height: 45vh; overflow-y: auto; border-bottom: 2px dashed #e2e8f0; padding-bottom: 16px; margin-bottom: 16px;">
          <div class="passage-content" style="white-space: pre-wrap; line-height: 1.8; font-size: 16px;">${fullPassage}</div>
        </div>
      `;
    }

    if (q.type === "阅读理解") {
      const groupQuestions = allQuestions.filter(item => item.title === q.title);
      if (groupQuestions.length > 0) {
        contentHtml += `<div class="cloze-nav-bar">`;
        groupQuestions.forEach((item, idx) => {
          const qIndex = quizQuestions.findIndex(qq => qq.id === item.id);
          if (qIndex !== -1) {
            const itemRecord = answersRecord[qIndex];
            let statusClass = "";
            if (itemRecord) {
              statusClass = itemRecord.isCorrect ? "cloze-nav-correct" : "cloze-nav-wrong";
            } else if (qIndex === currentIndex) {
              statusClass = "cloze-nav-current";
            }
            contentHtml += `<button class="cloze-nav-btn ${statusClass}" onclick="jumpToQuestion(${qIndex})">${idx + 1}</button>`;
          }
        });
        contentHtml += `</div>`;
      }
    }

    let prefix = q.type === "完形填空" ? `${currentIndex + 1}. ` : "";
    contentHtml += `<div class="main-question-text">${prefix}${q.question}</div>`;

  } else {
    if (q.passage) {
      if (q.passage !== currentPassage) {
        currentPassage = q.passage;
        isPassageExpanded = false;
      }
      contentHtml += `
        <div class="passage-container">
          <button class="toggle-passage-btn" onclick="togglePassage()">展开 / 折叠 原文</button>
          <div id="passageContent" class="passage-content ${isPassageExpanded ? '' : 'hidden'}">${q.passage}</div>
        </div>
      `;
    }
    
    if (q.type === "翻译") {
      const userAnswer = record ? record.inputText : "";
      contentHtml += `<div class="main-question-text">${q.question}</div>`;
      contentHtml += `
        <textarea id="transInput" class="trans-input-box" placeholder="请输入答案" ${record ? 'disabled' : ''}>${userAnswer}</textarea>
        <div style="text-align: center; margin-top: 10px; margin-bottom: 10px; font-size: 13px; color: #94a3b8;">
          - 翻译题不提供系统判断正误，请自行判断 -
        </div>
        <div style="text-align: center;">
           <button id="showTransBtn" class="primary" style="width: 100%;" onclick="showTranslation()">解答 / 查看解析</button>
        </div>
        <div id="transResultBox" class="trans-result-box ${record ? '' : 'hidden'}">
           <div class="trans-tab-nav">
              <button class="trans-tab active" onclick="switchTransTab('ref', this)">参考答案</button>
              <button class="trans-tab" onclick="switchTransTab('vocab', this)">词汇</button>
              <button class="trans-tab" onclick="switchTransTab('sentence', this)">句型</button>
              <button class="trans-tab" onclick="switchTransTab('grammar', this)">语法</button>
           </div>
           <div id="transContentRef" class="trans-tab-content">${q.answer || "暂无"}</div>
           <div id="transContentVocab" class="trans-tab-content hidden">${q.vocab || "暂无"}</div>
           <div id="transContentSentence" class="trans-tab-content hidden">${q.sentence || "暂无"}</div>
           <div id="transContentGrammar" class="trans-tab-content hidden">${q.grammarDetail || "暂无"}</div>
        </div>
      `;
    } else {
      contentHtml += `<div class="main-question-text">${q.question}</div>`;
    }
  }

  els.questionText.innerHTML = `
    <div style="font-size:14px;color:#64748b;margin-bottom:12px;">${tagHtml}</div>
    ${contentHtml}
  `;

  els.optionsBox.innerHTML = "";
  if (q.type !== "翻译") {
    q.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      btn.innerHTML = `<span class="letter">${LETTERS[idx]}</span><span class="option-text">${opt}</span>`;
      btn.addEventListener("click", () => chooseOption(idx));
      els.optionsBox.appendChild(btn);
    });

    if (record && record.selected !== undefined) {
      const correctIndex = Number(q.answer);
      const optionButtons = [...els.optionsBox.querySelectorAll(".option")];
      optionButtons.forEach((btn, i) => {
        btn.disabled = true;
        if (i === correctIndex) btn.classList.add("correct");
        if (i === record.selected && i !== correctIndex) btn.classList.add("wrong");
      });

      const correctLetter = LETTERS[correctIndex];
      els.feedbackBox.className = `feedback ${record.isCorrect ? "feedback-correct" : "feedback-wrong"}`;
      els.feedbackBox.innerHTML = `
        <div class="feedback-title">${record.isCorrect ? "✅ 答对了" : "❌ 答错了"}</div>
        <div style="margin-bottom:8px;">正确答案：${correctLetter}. ${q.options[correctIndex]}</div>
        <div class="explain">${q.explain || "暂无解析"}</div>
      `;
      els.feedbackBox.classList.remove("hidden");
    } else {
      els.feedbackBox.className = "feedback hidden";
    }
  } else {
     els.feedbackBox.className = "feedback hidden";
  }

  els.prevBtn.disabled = currentIndex === 0;
  els.nextBtn.textContent = currentIndex === quizQuestions.length - 1 ? "完成本轮" : "下一题";
}

window.showTranslation = function() {
  const inputEl = document.getElementById("transInput");
  const inputVal = inputEl ? inputEl.value : "";
  
  answersRecord[currentIndex] = { isAnswered: true, inputText: inputVal };
  
  const btn = document.getElementById("showTransBtn");
  if(btn) btn.classList.add("hidden");
  if(inputEl) inputEl.disabled = true;

  const resultBox = document.getElementById("transResultBox");
  if(resultBox) resultBox.classList.remove("hidden");
}

window.switchTransTab = function(tabName, btn) {
  document.querySelectorAll(".trans-tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  document.querySelectorAll(".trans-tab-content").forEach(c => c.classList.add("hidden"));
  document.getElementById("transContent" + tabName.charAt(0).toUpperCase() + tabName.slice(1)).classList.remove("hidden");
}

function chooseOption(idx) {
  if (answersRecord[currentIndex] && answersRecord[currentIndex].selected !== undefined) return; 

  const q = quizQuestions[currentIndex];
  const correctIndex = Number(q.answer);
  const optionButtons = [...els.optionsBox.querySelectorAll(".option")];

  optionButtons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === correctIndex) btn.classList.add("correct");
    if (i === idx && i !== correctIndex) btn.classList.add("wrong");
  });

  const isCorrect = idx === correctIndex;
  answersRecord[currentIndex] = { selected: idx, isCorrect: isCorrect };

  stats.total++;
  if (isCorrect) {
    stats.correct++;
    if (currentMode === "wrong") { wrongIds.delete(String(q.id)); saveWrongIds(); }
    
    // 全真模拟加分
    if (currentMode === "mock" && q.score) {
      currentMockScore += q.score;
      updateMockScoreUI();
    }
  } else {
    wrongIds.add(String(q.id)); saveWrongIds();
  }
  saveStats();

  const correctLetter = LETTERS[correctIndex];
  els.feedbackBox.className = `feedback ${isCorrect ? "feedback-correct" : "feedback-wrong"}`;
  els.feedbackBox.innerHTML = `
    <div class="feedback-title">${isCorrect ? "✅ 答对了" : "❌ 答错了"}</div>
    <div style="margin-bottom:8px;">正确答案：${correctLetter}. ${q.options[correctIndex]}</div>
    <div class="explain">${q.explain || "暂无解析"}</div>
  `;
  els.feedbackBox.classList.remove("hidden");

  if (q.title && (q.type === "完形填空" || q.type === "阅读理解")) {
    if (q.type === "完形填空") {
      const activeBlank = document.querySelector('.cloze-blank.blank-active');
      if (activeBlank) {
        activeBlank.classList.remove('blank-active');
        activeBlank.classList.add(isCorrect ? 'blank-correct' : 'blank-wrong');
      }
    }
    const groupQuestions = allQuestions.filter(item => item.title === q.title);
    const idxInGroup = groupQuestions.findIndex(item => item.id === q.id);
    const navBtns = document.querySelectorAll('.cloze-nav-btn');
    if (navBtns[idxInGroup]) {
      navBtns[idxInGroup].classList.remove('cloze-nav-current');
      navBtns[idxInGroup].classList.add(isCorrect ? 'cloze-nav-correct' : 'cloze-nav-wrong');
    }
  }
}

function renderCard() {
  els.cardGrid.innerHTML = "";
  
  let currentTitle = "";
  let passageWrapper = null;

  for (let i = 0; i < quizQuestions.length; i++) {
    const q = quizQuestions[i];
    
    if (q.title && (q.type === "完形填空" || q.type === "阅读理解")) {
      if (q.title !== currentTitle) {
        currentTitle = q.title;
        passageWrapper = document.createElement("div");
        passageWrapper.style.width = "100%";
        passageWrapper.style.marginBottom = "16px";
        
        const titleDiv = document.createElement("div");
        titleDiv.textContent = q.title;
        titleDiv.style.fontSize = "14px";
        titleDiv.style.color = "#64748b";
        titleDiv.style.marginBottom = "8px";
        titleDiv.style.borderLeft = "3px solid #2563eb";
        titleDiv.style.paddingLeft = "8px";
        
        const gridDiv = document.createElement("div");
        gridDiv.style.display = "grid";
        gridDiv.style.gridTemplateColumns = "repeat(auto-fill, minmax(40px, 1fr))";
        gridDiv.style.gap = "12px";
        
        passageWrapper.appendChild(titleDiv);
        passageWrapper.appendChild(gridDiv);
        els.cardGrid.appendChild(passageWrapper);
      }
    } else {
      if (i === 0) {
        passageWrapper = document.createElement("div");
        passageWrapper.style.width = "100%";
        const gridDiv = document.createElement("div");
        gridDiv.style.display = "grid";
        gridDiv.style.gridTemplateColumns = "repeat(auto-fill, minmax(40px, 1fr))";
        gridDiv.style.gap = "12px";
        passageWrapper.appendChild(gridDiv);
        els.cardGrid.appendChild(passageWrapper);
      }
    }

    const targetGrid = passageWrapper.lastElementChild;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card-item";
    
    if (q.title && (q.type === "完形填空" || q.type === "阅读理解")) {
      const samePassageQs = quizQuestions.filter(item => item.title === q.title);
      btn.textContent = samePassageQs.findIndex(item => item.id === q.id) + 1;
    } else {
      btn.textContent = i + 1;
    }
    
    const record = answersRecord[i];
    if (record) {
      if (q.type === "翻译") {
        btn.classList.add("card-answered");
      } else {
        btn.classList.add(record.isCorrect ? "card-correct" : "card-wrong");
      }
    } else if (i === currentIndex) {
      btn.classList.add("card-current");
    }
    
    btn.onclick = () => {
      currentIndex = i;
      els.cardModal.classList.add("hidden");
      renderQuestion();
    };
    targetGrid.appendChild(btn);
  }
}

els.tabHome.onclick = () => switchTab('home');
els.tabProfile.onclick = () => switchTab('profile');
els.startMockBtn.onclick = () => startMockExam();
els.startFullBtn.onclick = () => switchTab('directory');
els.startDailyBtn.onclick = () => startQuiz('daily');
els.backFromDirBtn.onclick = () => switchTab('home');

els.profileWrongBtn.onclick = () => {
  if (wrongIds.size === 0) return alert("错题本是空的！");
  startQuiz('wrong');
};
els.historyBtn.onclick = () => alert(`开发提示：\n你已经练习了 ${stats.sessions} 次\n共作答 ${stats.total} 题\n答对 ${stats.correct} 题`);
els.vocabBtn.onclick = () => alert("单词本功能规划中！");

els.prevBtn.onclick = () => {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
  }
};

els.nextBtn.onclick = () => {
  if (currentIndex < quizQuestions.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    alert("本轮练习完成！");
    exitQuiz();
  }
};

els.openCardBtn.onclick = () => {
  renderCard();
  els.cardModal.classList.remove("hidden");
};
els.closeCardBtn.onclick = () => els.cardModal.classList.add("hidden");
els.submitQuizBtn.onclick = () => {
  const answeredCount = Object.keys(answersRecord).length;
  if (currentMode === "mock") {
    alert(`交卷成功！\n本轮共 ${quizQuestions.length} 题\n你作答了 ${answeredCount} 题\n\n📝 本次客观题得分：${currentMockScore} 分\n(翻译题需自行判分)`);
  } else {
    alert(`交卷成功！\n本轮共 ${quizQuestions.length} 题\n你作答了 ${answeredCount} 题`);
  }
  els.cardModal.classList.add("hidden");
  exitQuiz();
};

els.backHomeBtn.onclick = () => { if(confirm("确定要中途退出吗？")) exitQuiz(); };

loadQuestions();
switchTab('home');