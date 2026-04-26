// ==================== DEBT MACHINE — Full CloverPit Mechanics ====================

// ===== TELEGRAM MINI APP INIT =====
const tg = window.Telegram?.WebApp;
if(tg){
    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes();
    // Request fullscreen (Bot API 8.0+)
    if(tg.requestFullscreen) tg.requestFullscreen();
    // Apply Telegram theme
    document.documentElement.style.setProperty('--tg-bg', tg.themeParams?.bg_color || '#0a0a0f');
}
// Haptic feedback helper
function haptic(type){
    try{ tg?.HapticFeedback?.impactOccurred(type||'light'); }catch(e){}
}

// ===== SOUND EFFECTS (Web Audio API, no files needed) =====
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;
function getAudio(){ if(!audioCtx) audioCtx=new AudioCtx(); return audioCtx; }

function sfx(type){
    try{
        const ctx=getAudio();
        const now=ctx.currentTime;
        switch(type){
            case 'spin': {
                // Quick tick sound
                const o=ctx.createOscillator();const g=ctx.createGain();
                o.type='square';o.frequency.setValueAtTime(800,now);o.frequency.exponentialRampToValueAtTime(200,now+0.1);
                g.gain.setValueAtTime(0.08,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.1);
                o.connect(g);g.connect(ctx.destination);o.start(now);o.stop(now+0.1);break;
            }
            case 'reelstop': {
                const o=ctx.createOscillator();const g=ctx.createGain();
                o.type='sine';o.frequency.setValueAtTime(300,now);o.frequency.exponentialRampToValueAtTime(150,now+0.08);
                g.gain.setValueAtTime(0.12,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.15);
                o.connect(g);g.connect(ctx.destination);o.start(now);o.stop(now+0.15);break;
            }
            case 'win': {
                [0,.1,.2].forEach((t,i)=>{
                    const o=ctx.createOscillator();const g=ctx.createGain();
                    o.type='sine';o.frequency.setValueAtTime([523,659,784][i],now+t);
                    g.gain.setValueAtTime(0.1,now+t);g.gain.exponentialRampToValueAtTime(0.001,now+t+0.2);
                    o.connect(g);g.connect(ctx.destination);o.start(now+t);o.stop(now+t+0.2);
                });break;
            }
            case 'jackpot': {
                [0,.08,.16,.24,.32,.4].forEach((t,i)=>{
                    const o=ctx.createOscillator();const g=ctx.createGain();
                    o.type='sine';o.frequency.setValueAtTime(400+i*100,now+t);
                    g.gain.setValueAtTime(0.12,now+t);g.gain.exponentialRampToValueAtTime(0.001,now+t+0.15);
                    o.connect(g);g.connect(ctx.destination);o.start(now+t);o.stop(now+t+0.15);
                });break;
            }
            case '666': {
                const o=ctx.createOscillator();const g=ctx.createGain();
                o.type='sawtooth';o.frequency.setValueAtTime(120,now);o.frequency.exponentialRampToValueAtTime(40,now+0.8);
                g.gain.setValueAtTime(0.15,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.8);
                o.connect(g);g.connect(ctx.destination);o.start(now);o.stop(now+0.8);break;
            }
            case 'deposit': {
                const o=ctx.createOscillator();const g=ctx.createGain();
                o.type='sine';o.frequency.setValueAtTime(600,now);o.frequency.exponentialRampToValueAtTime(1200,now+0.15);
                g.gain.setValueAtTime(0.08,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.2);
                o.connect(g);g.connect(ctx.destination);o.start(now);o.stop(now+0.2);break;
            }
            case 'buy': {
                const o=ctx.createOscillator();const g=ctx.createGain();
                o.type='triangle';o.frequency.setValueAtTime(880,now);o.frequency.exponentialRampToValueAtTime(1320,now+0.1);
                g.gain.setValueAtTime(0.08,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.15);
                o.connect(g);g.connect(ctx.destination);o.start(now);o.stop(now+0.15);break;
            }
        }
        // Telegram haptic feedback
        if(type==='666'||type==='jackpot') haptic('heavy');
        else if(type==='win'||type==='buy') haptic('medium');
        else if(type==='reelstop') haptic('light');
    }catch(e){}
}

// ===== SYMBOLS (7 types with CloverPit weights) =====
const SYMBOLS = [
    { id:'cherry',  emoji:'🍒', weight:1.3, value:2  },
    { id:'lemon',   emoji:'🍋', weight:1.3, value:3  },
    { id:'clover',  emoji:'🍀', weight:1.0, value:5  },
    { id:'bell',    emoji:'🔔', weight:1.0, value:8  },
    { id:'diamond', emoji:'💎', weight:0.8, value:15 },
    { id:'chest',   emoji:'📦', weight:0.8, value:20 },
    { id:'seven',   emoji:'7️⃣', weight:0.5, value:50 },
];
const TOTAL_WEIGHT = SYMBOLS.reduce((s,v)=>s+v.weight,0);

// Pattern definitions: name, minMatch, multiplier
const PATTERNS = [
    { name:'3 совпадения', min:3, mult:1   },
    { name:'4 совпадения', min:4, mult:2   },
    { name:'5 совпадений', min:5, mult:3   },
    { name:'6 совпадений', min:6, mult:5   },
    { name:'7+ совп.',    min:7, mult:8   },
    { name:'10+ совп.',   min:10,mult:15  },
    { name:'ДЖЕКПОТ',    min:13,mult:50  },
];

// Lucky Charms pool
const CHARMS = [
    { id:'crystal',  emoji:'🔮', name:'Хруст. шар',    desc:'+3 Удача на след. спин',         price:3,  fx:'luck_temp', val:3 },
    { id:'shield',   emoji:'🛡️', name:'Щит',           desc:'Блокирует одну ☠️ 666',           price:4,  fx:'shield',    val:1 },
    { id:'goldtooth',emoji:'💰', name:'Золотой зуб',   desc:'Символы x2 на 1 раунд',         price:6,  fx:'sym_mult',  val:2 },
    { id:'dice',     emoji:'🎲', name:'Краплёные',     desc:'+1 Удача навсегда',             price:12, fx:'luck_perm', val:1 },
    { id:'horseshoe',emoji:'🧿', name:'Подкова',        desc:'+4 Удача на 3 спина',            price:6,  fx:'luck_dur',  val:4, dur:3 },
    { id:'catfood',  emoji:'🐱', name:'Кошачий корм',  desc:'+2 доп. спина в этом раунде',  price:5,  fx:'extra_spin',val:2 },
    { id:'shroom',   emoji:'🍄', name:'Грибок',          desc:'Выплаты x2 в этом раунде',     price:7,  fx:'pay_mult',  val:2 },
    { id:'fakecoin', emoji:'🪙', name:'Фальш. монета',  desc:'+1 спин и +4 Удача',             price:5,  fx:'fakecoin',  val:1 },
    { id:'voucher',  emoji:'🎟️', name:'Ваучер',          desc:'+4 бесплатных билета',        price:2,  fx:'free_tix',  val:4 },
    { id:'battery',  emoji:'🔋', name:'Аккумулятор',   desc:'+3 Удача навсегда',             price:18, fx:'luck_perm', val:3 },
    { id:'magnet',   emoji:'🧲', name:'Магнит',          desc:'Лучший символ на весь спин',  price:6,  fx:'magnet',    val:1 },
    { id:'piggy',    emoji:'🐷', name:'Копилка',        desc:'+15% процент в банке',          price:7,  fx:'interest',  val:0.15 },
];

// Phone call deals
const PHONE_DEALS = [
    { title:'Двойной удар',      desc:'Долг x2 в след. дедлайне, но +5 Удача навсегда.', risk:'Долг x2',
      fx:g=>{ g.nextDebtMult=2; g.luck+=5; }},
    { title:'Чистый лист',      desc:'Потерять все талисманы, долг сбросить до $300.', risk:'Потеря талисманов',
      fx:g=>{ g.charms=[]; g.currentDebt=300; }},
    { title:'Проклятие черепа', desc:'Шанс 666 +50%, но все выплаты x2.', risk:'Больше 666',
      fx:g=>{ g.skullChance+=0.03; g.globalPayMult*=2; }},
    { title:'Доп. время',        desc:'+2 спина за раунд, но долг растёт на 30% быстрее.', risk:'Быстрее долг',
      fx:g=>{ g.bonusSpins+=2; g.debtGrowth+=0.15; }},
    { title:'Жертва удаче',     desc:'Отдать $150 из банка, получить +4 Удача.', risk:'-$150',
      fx:g=>{ g.atm=Math.max(0,g.atm-150); g.luck+=4; }},
    { title:'Пакт жадности',    desc:'Вишня/Лимон = 0, Алмаз/Семёрка x3.', risk:'Слабые символы обнулятся',
      fx:g=>{ g.greedPact=true; }},
    { title:'Взаймы',           desc:'Пропустить дедлайн. След. долг x3.', risk:'Долг x3',
      fx:g=>{ g.skipDeadline=true; g.nextDebtMult=3; }},
    { title:'Сдвиг весов',      desc:'Семёрка падает 2x чаще. Вишня 2x реже.', risk:'Меньше простых побед',
      fx:g=>{ g.weightMods.seven=(g.weightMods.seven||1)*2; g.weightMods.cherry=(g.weightMods.cherry||1)*0.5; }},
];

// ===== GAME STATE =====
let G = {};
function initGame() {
    G = {
        atm:0, coins:0, totalEarned:0, maxBank:0,
        deadline:1, currentDebt:300, round:1, roundsPerDeadline:3,
        spinsLeft:0, spinsThisRound:0,
        luck:0, tempLuck:0, tempLuckSpins:0,
        tickets:0, charms:[], maxCharms:4,
        // Modifiers
        debtGrowth:0.7, nextDebtMult:1, globalPayMult:1, symMult:1, payMult:1,
        bonusSpins:0, skullChance:0.06, interestRate:0.10,
        greedPact:false, hasShield:false, hasMagnet:false,
        skipDeadline:false, weightMods:{},
        // Tracking
        isSpinning:false, lossStreak:0, spinCount:0, grid:[],
    };
}
initGame();

// ===== DOM =====
const $=id=>document.getElementById(id);
const dom = {
    app:$('app'),
    screens:{title:$('screen-title'),spinChoice:$('screen-spin-choice'),game:$('screen-game'),
             shop:$('screen-shop'),phone:$('screen-phone'),gameover:$('screen-gameover'),
             deadlineResult:$('screen-deadline-result'),achievements:$('screen-achievements')},
    deadlineNum:$('deadline-num'), debtAmount:$('debt-amount'), debtBar:$('debt-bar'),
    hudDebt:$('hud-debt'), roundNum:$('round-num'), roundNumChoice:$('round-num-choice'),
    spinsLeft:$('spins-left'), bankAmount:$('bank-amount'), coinsAmount:$('coins-amount'),
    luckValue:$('luck-value'), ticketValue:$('ticket-value'),
    machineLight:$('machine-light'), resultText:$('result-text'),
    gridContainer:$('grid-container'),
    btnStart:$('btn-start'), btnSpin:$('btn-spin'), btnDeposit:$('btn-deposit'),
    btnContinue:$('btn-continue'), btnRetry:$('btn-retry'), btnReroll:$('btn-reroll'),
    opt3:$('opt-3-spins'), opt7:$('opt-7-spins'),
    charmList:$('charm-list'), shopTickets:$('shop-tickets-display'),
    phoneMsg:$('phone-message'), phoneChoices:$('phone-choices'),
    popupWin:$('popup-win'), popupAmt:$('popup-amount'), popupCombo:$('popup-combo'),
    popup666:$('popup-666'), popupLuck:$('popup-luck'), luckBoostText:$('luck-boost-text'),
    goDeadlines:$('go-deadlines'), goEarned:$('go-earned'), goMaxBank:$('go-maxbank'),
    activeCharms:$('active-charms'), deadlineResultContent:$('deadline-result-content'),
};

// ===== PARTICLES =====
(function(){const c=$('particles');for(let i=0;i<25;i++){const p=document.createElement('div');p.className='particle';p.style.left=Math.random()*100+'%';p.style.animationDuration=(8+Math.random()*12)+'s';p.style.animationDelay=Math.random()*10+'s';p.style.width=p.style.height=(1+Math.random()*3)+'px';c.appendChild(p)}})();

// ===== SCREENS =====
function showScreen(name){
    Object.values(dom.screens).forEach(s=>s.classList.remove('active'));
    if(dom.screens[name]) dom.screens[name].classList.add('active');
}

// ===== BUILD GRID =====
function buildGrid(){
    clearWinLines();
    dom.gridContainer.innerHTML='';
    G.grid=[];
    for(let r=0;r<3;r++){
        G.grid[r]=[];
        for(let c=0;c<5;c++){
            const cell=document.createElement('div');
            cell.className='grid-cell';
            cell.id=`cell-${r}-${c}`;
            const sym=getWeightedSymbol();
            cell.textContent=sym.emoji;
            G.grid[r][c]=sym;
            dom.gridContainer.appendChild(cell);
        }
    }
}

// ===== WEIGHTED SYMBOL =====
function getWeightedSymbol(){
    let weights=SYMBOLS.map(s=>{
        let w=s.weight;
        if(G.weightMods[s.id]) w*=G.weightMods[s.id];
        return w;
    });
    let total=weights.reduce((a,b)=>a+b,0);
    let r=Math.random()*total;
    for(let i=0;i<SYMBOLS.length;i++){
        r-=weights[i];
        if(r<=0) return SYMBOLS[i];
    }
    return SYMBOLS[0];
}

// ===== LUCK SYSTEM =====
// Balanced: cap at 8 forced, diminishing returns, each point has 70% chance
function applyLuck(grid){
    const totalLuck=G.luck+G.tempLuck;
    if(totalLuck<=0) return grid;
    // Count symbols on grid
    const counts={};
    for(let r=0;r<3;r++) for(let c=0;c<5;c++){
        const id=grid[r][c].id;
        counts[id]=(counts[id]||0)+1;
    }
    // Find most frequent symbol
    let bestId=null, bestCount=0;
    for(const[id,cnt] of Object.entries(counts)){
        if(cnt>bestCount){bestCount=cnt;bestId=id;}
    }
    if(!bestId) return grid;
    const targetSym=SYMBOLS.find(s=>s.id===bestId);
    
    // Diminishing returns: first 5 points = 80% each, 6-10 = 50%, 11+ = 25%
    let forcedCount=0;
    for(let i=1;i<=totalLuck;i++){
        let chance = i<=5 ? 0.80 : i<=10 ? 0.50 : 0.25;
        if(Math.random()<chance) forcedCount++;
    }
    // Hard cap: max 8 forced symbols per spin (prevents easy jackpots)
    forcedCount = Math.min(forcedCount, 8);
    let remaining = Math.min(forcedCount, 15-bestCount);
    
    const nonMatching=[];
    for(let r=0;r<3;r++) for(let c=0;c<5;c++){
        if(grid[r][c].id!==bestId) nonMatching.push({r,c});
    }
    nonMatching.sort(()=>Math.random()-0.5);
    for(let i=0;i<remaining && i<nonMatching.length;i++){
        const{r,c}=nonMatching[i];
        grid[r][c]=targetSym;
    }
    return grid;
}

// ===== HUD =====
function updateHUD(){
    dom.deadlineNum.textContent=G.deadline;
    dom.debtAmount.textContent='$'+G.currentDebt;
    dom.roundNum.textContent=G.round+'/'+G.roundsPerDeadline;
    dom.spinsLeft.textContent=G.spinsLeft;
    dom.bankAmount.textContent='$'+G.atm;
    dom.coinsAmount.textContent='$'+G.coins;
    dom.luckValue.textContent=G.luck+G.tempLuck;
    dom.ticketValue.textContent=G.tickets;
    const total=G.atm+G.coins;
    const pct=Math.min(100,(total/G.currentDebt)*100);
    dom.debtBar.style.width=pct+'%';
    dom.debtBar.style.background=pct>=100?'linear-gradient(90deg,var(--green),#00ffaa)':pct>=50?'linear-gradient(90deg,var(--green),var(--gold))':'linear-gradient(90deg,var(--red),var(--gold))';
    if(G.spinsLeft<=1&&total<G.currentDebt){dom.hudDebt.classList.add('danger');dom.machineLight.classList.add('danger')}
    else{dom.hudDebt.classList.remove('danger');dom.machineLight.classList.remove('danger')}
    renderCharms();
}
function renderCharms(){
    dom.activeCharms.innerHTML='';
    // Show slot counter
    const counter=document.createElement('div');
    counter.className='charm-counter';
    counter.textContent=G.charms.length+'/'+G.maxCharms;
    dom.activeCharms.appendChild(counter);
    // Show active charms (clickable to remove)
    G.charms.forEach((c,idx)=>{
        const b=document.createElement('div');
        b.className='charm-badge active';
        b.textContent=c.emoji;
        b.title=c.name+' — нажми чтобы снять';
        b.addEventListener('click',()=>{
            if(G.isSpinning) return;
            removeCharm(idx);
        });
        dom.activeCharms.appendChild(b);
    });
    // Show empty slots
    for(let i=G.charms.length;i<G.maxCharms;i++){
        const empty=document.createElement('div');
        empty.className='charm-badge empty';
        empty.textContent='·';
        dom.activeCharms.appendChild(empty);
    }
}

function removeCharm(idx){
    const charm=G.charms[idx];
    if(!charm) return;
    // Reverse the charm effect
    switch(charm.fx){
        case'shield':    G.hasShield=false; break;
        case'magnet':    G.hasMagnet=false; break;
        case'sym_mult':  G.symMult/=charm.val; break;
        case'pay_mult':  G.payMult/=charm.val; break;
        case'interest':  G.interestRate-=charm.val; break;
    }
    G.charms.splice(idx,1);
    sfx('reelstop');
    updateHUD();
}

// ===== SPIN =====
async function spin(){
    if(G.isSpinning||G.spinsLeft<=0) return;
    // Pull lever
    const lever=$('lever');
    lever.classList.add('pulled');
    setTimeout(()=>lever.classList.remove('pulled'),500);
    G.isSpinning=true;
    dom.btnSpin.disabled=true;
    dom.btnDeposit.classList.add('hidden');
    dom.popupWin.classList.add('hidden');
    dom.popup666.classList.add('hidden');
    dom.resultText.textContent='';
    clearWinLines();

    // Generate new grid
    for(let r=0;r<3;r++) for(let c=0;c<5;c++){
        G.grid[r][c]=getWeightedSymbol();
    }

    // Apply magnet: force all cells to best symbol
    if(G.hasMagnet){
        const best=SYMBOLS.reduce((a,b)=>a.value>b.value?a:b);
        for(let r=0;r<3;r++) for(let c=0;c<5;c++) G.grid[r][c]=best;
        G.hasMagnet=false;
        G.charms=G.charms.filter(c=>c.id!=='magnet');
    }

    // Apply luck
    applyLuck(G.grid);

    // Spin animation — realistic reel cycling
    sfx('spin');
    const cells=dom.gridContainer.querySelectorAll('.grid-cell');
    cells.forEach(c=>{c.classList.remove('matched','skull-hit')});
    
    // Start all columns spinning (rapidly cycling symbols)
    const spinIntervals=[];
    for(let col=0;col<5;col++){
        const interval=setInterval(()=>{
            for(let row=0;row<3;row++){
                const cell=$(`cell-${row}-${col}`);
                const randSym=SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)];
                cell.textContent=randSym.emoji;
                cell.classList.add('spinning');
            }
        },70);
        spinIntervals.push(interval);
    }

    // Stop columns one by one, left to right
    for(let col=0;col<5;col++){
        await delay(300 + col*180); // each column spins longer
        clearInterval(spinIntervals[col]);
        sfx('reelstop');
        for(let row=0;row<3;row++){
            const cell=$(`cell-${row}-${col}`);
            cell.classList.remove('spinning');
            cell.classList.add('reel-stop');
            cell.textContent=G.grid[row][col].emoji;
        }
        // Remove bounce class after animation
        setTimeout(()=>{
            for(let row=0;row<3;row++){
                $(`cell-${row}-${col}`).classList.remove('reel-stop');
            }
        },300);
    }

    // Check for 666
    const hit666=Math.random()<G.skullChance;
    if(hit666 && (G.coins>0 || G.atm>0)){
        if(G.hasShield){
            G.hasShield=false;
            G.charms=G.charms.filter(c=>c.id!=='shield');
            dom.resultText.textContent='🛡️ Щит заблокировал 666!';
            sfx('reelstop');
        } else {
            shakeScreen();
            sfx('666');
            // Fill all cells with skulls
            for(let r=0;r<3;r++) for(let c=0;c<5;c++){
                const cell=$(`cell-${r}-${c}`);
                cell.textContent='☠️';
                cell.classList.add('skull-hit');
            }
            await delay(400);
            // Steal coins, and if no coins — steal half of ATM
            if(G.coins>0){
                G.coins=0;
            } else {
                const stolen=Math.floor(G.atm*0.5);
                G.atm-=stolen;
            }
            dom.popup666.classList.remove('hidden');
            await delay(2000);
            dom.popup666.classList.add('hidden');
        }
    } else {
        // Evaluate matches (multi-match!)
        const result=evaluateGrid();
        if(result.totalPayout>0){
            G.lossStreak=0;
            // Highlight ALL matched cells + draw lines
            result.allMatchedCells.forEach(({r,c})=>$(`cell-${r}-${c}`).classList.add('matched'));
            drawWinLines(result.allMatchedCells);
            sfx(result.totalPayout>=200?'jackpot':'win');
            
            // Let the player see the winning lines first
            await delay(800);
            
            G.coins+=result.totalPayout;
            G.totalEarned+=result.totalPayout;
            G.maxBank=Math.max(G.maxBank,G.atm+G.coins);
            // Build combo text for multiple matches
            const comboText=result.matches.map(m=>m.text).join(' + ');
            if(result.matches.length>1) G._hadMultiMatch=true;
            showPopup(result.totalPayout, comboText, result.matches.length>1);
        } else {
            G.lossStreak++;
            dom.resultText.textContent='Нет совпадений...';
            // Rubber-banding: 4 losses = pity luck
            if(G.lossStreak>=4){
                const boost=Math.min(5, 3+Math.floor((G.lossStreak-4)));
                G.tempLuck+=boost;
                G.tempLuckSpins+=1;
                G.lossStreak=0;
                dom.luckBoostText.textContent=`+${boost} УДАЧА`;
                dom.popupLuck.classList.remove('hidden');
                await delay(1200);
                dom.popupLuck.classList.add('hidden');
            }
        }
    }

    G.spinsLeft--;
    G.spinCount++;
    
    // Temp luck countdown (runs first, before new boosts)
    if(G.tempLuckSpins>0){G.tempLuckSpins--;if(G.tempLuckSpins<=0)G.tempLuck=0;}
    
    // Spontaneous luck: ~12% chance per spin (like original CloverPit)
    if(Math.random()<0.12 && G.tempLuck===0){
        const boost = 2 + Math.floor(Math.random()*3); // +2 to +4
        G.tempLuck+=boost;
        G.tempLuckSpins=1; // lasts 1 spin
        dom.luckBoostText.textContent=`+${boost} УДАЧА ✨`;
        dom.popupLuck.classList.remove('hidden');
        sfx('win');
        await delay(1000);
        dom.popupLuck.classList.add('hidden');
    }

    G.isSpinning=false;
    updateHUD();

    if(G.spinsLeft<=0){
        // End of round
        dom.btnSpin.disabled=true;
        setTimeout(()=>endRound(),1200);
    } else {
        dom.btnSpin.disabled=false;
        dom.btnDeposit.classList.remove('hidden');
    }
}

// ===== EVALUATE 3×5 GRID (multi-match) =====
function evaluateGrid(){
    // Count all symbols
    const counts={};
    for(let r=0;r<3;r++) for(let c=0;c<5;c++){
        const id=G.grid[r][c].id;
        counts[id]=(counts[id]||0)+1;
    }
    
    const matches=[];
    const allMatchedCells=[];
    let totalPayout=0;
    
    // Find ALL symbols with 3+ matches
    for(const[id,cnt] of Object.entries(counts)){
        if(cnt<3) continue;
        
        const sym=SYMBOLS.find(s=>s.id===id);
        let symValue=sym.value;
        
        // Greed pact modifier
        if(G.greedPact){
            if(sym.id==='cherry'||sym.id==='lemon') symValue=0;
            if(sym.id==='diamond'||sym.id==='seven') symValue*=3;
        }
        
        // Symbol multiplier from charms
        symValue=Math.floor(symValue*G.symMult);
        
        // Find pattern multiplier
        let patternMult=1, patternName='3 совпадения';
        for(const p of PATTERNS){
            if(cnt>=p.min){patternMult=p.mult;patternName=p.name;}
        }
        
        let payout=symValue*cnt*patternMult;
        payout=Math.floor(payout*G.payMult*G.globalPayMult);
        
        // Collect matched cells for this symbol
        const cells=[];
        for(let r=0;r<3;r++) for(let c=0;c<5;c++){
            if(G.grid[r][c].id===id) cells.push({r,c});
        }
        
        totalPayout+=payout;
        allMatchedCells.push(...cells);
        matches.push({
            sym, count:cnt, payout, patternName,
            text:`${sym.emoji} x${cnt} — ${patternName}`,
            cells
        });
    }
    
    // Sort by payout descending
    matches.sort((a,b)=>b.payout-a.payout);
    
    return {totalPayout, matches, allMatchedCells};
}

// ===== DEPOSIT TO ATM =====
function deposit(){
    if(G.coins<=0) return;
    sfx('deposit');
    G.atm+=G.coins;
    G.coins=0;
    dom.bankAmount.parentElement.classList.add('depositing');
    setTimeout(()=>dom.bankAmount.parentElement.classList.remove('depositing'),500);
    dom.btnDeposit.classList.add('hidden');
    dom.btnSpin.disabled=true;
    // Deposit = end of round, remaining spins are lost (like original CloverPit)
    G.spinsLeft=0;
    updateHUD();
    setTimeout(()=>endRound(),800);
}

// ===== END OF ROUND =====
function endRound(){
    // All spins used → auto-deposit to ATM
    if(G.coins>0){
        G.atm+=G.coins;
        G.coins=0;
        dom.bankAmount.parentElement.classList.add('depositing');
        setTimeout(()=>dom.bankAmount.parentElement.classList.remove('depositing'),500);
    }

    G.round++;
    if(G.round>G.roundsPerDeadline){
        // End of deadline — check payment
        checkDeadline();
    } else {
        // Next round — choose spins
        // Reset round modifiers
        G.symMult=1;
        G.payMult=1;
        showSpinChoice();
    }
}

// ===== DEADLINE CHECK =====
function checkDeadline(){
    if(G.skipDeadline){
        G.skipDeadline=false;
        deadlinePassed();
        return;
    }
    if(G.atm>=G.currentDebt){
        deadlinePassed();
    } else {
        gameOver();
    }
}

function deadlinePassed(){
    G.atm-=G.currentDebt;
    // Interest on remaining ATM balance
    const interest=Math.floor(G.atm*G.interestRate);
    G.atm+=interest;
    G.maxBank=Math.max(G.maxBank,G.atm);

    const content=dom.deadlineResultContent;
    content.className='deadline-result-content passed';
    content.innerHTML=`
        <h2>✅ ДОЛГ ОПЛАЧЕН!</h2>
        <div class="dr-detail">Оплачено $${G.currentDebt} — Остаток: $${G.atm}</div>
        ${interest>0?`<div class="dr-interest">+$${interest} проценты начислены 📈</div>`:''}
        <button class="btn btn-primary" id="btn-next-deadline"><span>➡️ СЛЕД. ДЕДЛАЙН</span></button>
    `;
    showScreen('deadlineResult');
    $('btn-next-deadline').addEventListener('click',()=>{
        G.deadline++;
        G.round=1;
        // Calculate next debt
        const growth=1+G.debtGrowth;
        G.currentDebt=Math.floor(G.currentDebt*growth*G.nextDebtMult);
        G.nextDebtMult=1;
        G.symMult=1; G.payMult=1;
        // Debt surge animation
        updateHUD();
        dom.hudDebt.classList.add('debt-surge');
        sfx('666');
        setTimeout(()=>dom.hudDebt.classList.remove('debt-surge'),700);
        // Show phone call every 2 deadlines, else shop
        if(G.deadline%2===0) showPhoneCall();
        else showShop();
    });
}

// ===== SPIN CHOICE =====
function showSpinChoice(){
    dom.roundNumChoice.textContent=G.round;
    showScreen('spinChoice');
}

// ===== SHOP =====
const REROLL_COST=2;

function showShop(){
    const available=[...CHARMS].sort(()=>Math.random()-0.5).slice(0,6);
    renderShop(available);
    showScreen('shop');
    updateHUD();
}

function renderShop(available){
    dom.charmList.innerHTML='';
    dom.shopTickets.textContent='🎫 '+G.tickets+' билетов';
    dom.btnReroll.disabled=G.tickets<REROLL_COST;
    G._shopCharms=available; // store for reroll
    available.forEach(charm=>{
        const card=document.createElement('div');
        const canBuy=G.tickets>=charm.price;
        card.className='charm-card'+(canBuy?'':' too-expensive');
        card.innerHTML=`<div class="charm-emoji">${charm.emoji}</div><div class="charm-name">${charm.name}</div><div class="charm-desc">${charm.desc}</div><div class="charm-price">${charm.price} 🎫</div>`;
        if(canBuy) card.addEventListener('click',()=>buyCharm(charm,card));
        dom.charmList.appendChild(card);
    });
}

function rerollShop(){
    if(G.tickets<REROLL_COST) return;
    G.tickets-=REROLL_COST;
    const newCharms=[...CHARMS].sort(()=>Math.random()-0.5).slice(0,6);
    renderShop(newCharms);
    updateHUD();
}

function buyCharm(charm,el){
    // Toggle: if already purchased, refund
    if(el.classList.contains('purchased')){
        refundCharm(charm,el);
        return;
    }
    if(G.tickets<charm.price) return;
    // Check charm slot limit (only for persistent charms)
    const persistentFx=['shield','magnet','sym_mult','pay_mult','interest'];
    if(persistentFx.includes(charm.fx) && G.charms.length>=G.maxCharms){
        // Flash the active charms to show they're full
        dom.activeCharms.classList.add('shake');
        setTimeout(()=>dom.activeCharms.classList.remove('shake'),500);
        return;
    }
    G.tickets-=charm.price;
    applyCharmEffect(charm, true);
    el.classList.add('purchased');
    sfx('buy');
    dom.shopTickets.textContent='🎫 '+G.tickets+' билетов';
    updateHUD();
}

function refundCharm(charm,el){
    G.tickets+=charm.price;
    applyCharmEffect(charm, false);
    el.classList.remove('purchased');
    dom.shopTickets.textContent='🎫 '+G.tickets+' билетов';
    updateHUD();
}

function applyCharmEffect(charm, apply){
    const dir = apply ? 1 : -1; // 1 = apply, -1 = undo
    switch(charm.fx){
        case'luck_temp': G.tempLuck+= charm.val*dir; if(!apply) G.tempLuckSpins=0; else G.tempLuckSpins=1; break;
        case'luck_perm': G.luck+= charm.val*dir; break;
        case'luck_dur':  G.tempLuck+= charm.val*dir; if(!apply) G.tempLuckSpins=0; else G.tempLuckSpins=charm.dur; break;
        case'shield':    G.hasShield=apply; if(apply) G.charms.push(charm); else G.charms=G.charms.filter(c=>c.id!=='shield'); break;
        case'magnet':    G.hasMagnet=apply; if(apply) G.charms.push(charm); else G.charms=G.charms.filter(c=>c.id!=='magnet'); break;
        case'sym_mult':  if(apply){G.symMult*=charm.val;G.charms.push(charm)}else{G.symMult/=charm.val;G.charms=G.charms.filter(c=>c.id!=='goldtooth')} break;
        case'pay_mult':  if(apply){G.payMult*=charm.val;G.charms.push(charm)}else{G.payMult/=charm.val;G.charms=G.charms.filter(c=>c.id!=='shroom')} break;
        case'extra_spin':G.bonusSpins+= charm.val*dir; break;
        case'fakecoin':  G.tempLuck+=4*dir; if(apply) G.tempLuckSpins=1; break;
        case'free_tix':  G.tickets+= charm.val*dir; break;
        case'interest':  G.interestRate+= charm.val*dir; if(apply) G.charms.push(charm); else G.charms=G.charms.filter(c=>c.id!=='piggy'); break;
    }
}

// ===== PHONE CALLS =====
function showPhoneCall(){
    const deals=[...PHONE_DEALS].sort(()=>Math.random()-0.5).slice(0,2);
    dom.phoneMsg.textContent='Таинственный голос предлагает сделку...';
    dom.phoneChoices.innerHTML='';
    deals.forEach(deal=>{
        const btn=document.createElement('button');
        btn.className='phone-choice';
        btn.innerHTML=`<div class="choice-title">${deal.title}</div><div>${deal.desc}</div><div class="choice-risk">⚠️ ${deal.risk}</div>`;
        btn.addEventListener('click',()=>{deal.fx(G);updateHUD();showShop()});
        dom.phoneChoices.appendChild(btn);
    });
    const skip=document.createElement('button');
    skip.className='phone-choice';
    skip.innerHTML='<div class="choice-title">Положить трубку</div><div>Отклонить. Играть безопасно.</div>';
    skip.addEventListener('click',()=>showShop());
    dom.phoneChoices.appendChild(skip);
    showScreen('phone');
}

// ===== WIN LINES =====
function clearWinLines(){
    const svg = document.getElementById('win-lines');
    if(svg) svg.innerHTML='';
}

function getCellCenter(r,c){
    const cell = document.getElementById(`cell-${r}-${c}`);
    if(!cell) return {x:0,y:0};
    const wrapper = document.getElementById('grid-wrapper');
    const wRect = wrapper.getBoundingClientRect();
    const cRect = cell.getBoundingClientRect();
    return {
        x: cRect.left - wRect.left + cRect.width/2,
        y: cRect.top - wRect.top + cRect.height/2
    };
}

function drawWinLines(matchedCells){
    clearWinLines();
    if(matchedCells.length<3) return;
    
    const set = new Set(matchedCells.map(({r,c})=>`${r},${c}`));
    const has = (r,c) => set.has(`${r},${c}`);
    const lines = [];
    const colors = ['#ffd700','#00ff88','#ff6600','#b44aff','#00ccff','#ff3366'];
    let colorIdx = 0;
    
    // Horizontal lines (3+ in a row)
    for(let r=0;r<3;r++){
        let start=null;
        for(let c=0;c<=5;c++){
            if(c<5 && has(r,c)){
                if(start===null) start=c;
            } else {
                if(start!==null && c-start>=2){
                    const pts=[];
                    for(let cc=start;cc<c;cc++) pts.push({r,c:cc});
                    lines.push(pts);
                }
                start=null;
            }
        }
    }
    
    // Vertical lines (all 3 rows in a column)
    for(let c=0;c<5;c++){
        if(has(0,c)&&has(1,c)&&has(2,c)){
            lines.push([{r:0,c},{r:1,c},{r:2,c}]);
        }
    }
    
    // Diagonal ↘ (top-left to bottom-right)
    for(let startC=0;startC<=2;startC++){
        const pts=[];
        for(let i=0;i<3&&startC+i<5;i++){
            if(has(i,startC+i)) pts.push({r:i,c:startC+i});
            else break;
        }
        if(pts.length>=3) lines.push(pts);
    }
    
    // Diagonal ↗ (bottom-left to top-right)
    for(let startC=0;startC<=2;startC++){
        const pts=[];
        for(let i=0;i<3&&startC+i<5;i++){
            if(has(2-i,startC+i)) pts.push({r:2-i,c:startC+i});
            else break;
        }
        if(pts.length>=3) lines.push(pts);
    }
    
    // If no structured lines found, connect all matched cells with a polyline
    if(lines.length===0 && matchedCells.length>=3){
        const sorted=[...matchedCells].sort((a,b)=>a.r===b.r?a.c-b.c:a.r-b.r);
        lines.push(sorted);
    }
    
    // Draw SVG lines
    const svg = document.getElementById('win-lines');
    const wrapper = document.getElementById('grid-wrapper');
    const wRect = wrapper.getBoundingClientRect();
    svg.setAttribute('viewBox',`0 0 ${wRect.width} ${wRect.height}`);
    
    lines.forEach((pts,idx)=>{
        const points = pts.map(({r,c})=>{
            const center = getCellCenter(r,c);
            return `${center.x},${center.y}`;
        }).join(' ');
        
        const polyline = document.createElementNS('http://www.w3.org/2000/svg','polyline');
        polyline.setAttribute('points', points);
        polyline.setAttribute('class','win-line');
        polyline.style.stroke = colors[(colorIdx+idx)%colors.length];
        // Measure length for dash animation
        polyline.setAttribute('stroke-dasharray','500');
        polyline.setAttribute('stroke-dashoffset','500');
        polyline.style.animationDelay = `${idx*0.15}s`;
        svg.appendChild(polyline);
    });
    colorIdx++;
}

// ===== GAME OVER =====
function gameOver(){
    shakeScreen();
    sfx('666');
    dom.goDeadlines.textContent=G.deadline-1;
    dom.goEarned.textContent='$'+G.totalEarned;
    dom.goMaxBank.textContent='$'+G.maxBank;
    // Reset pit animation (force re-trigger)
    const pit=$('pit-anim');
    const newPit=pit.cloneNode(true);
    pit.parentNode.replaceChild(newPit,pit);
    // Save best score
    saveBestScore();
    showScreen('gameover');
}

// ===== CONTINUE FOR STARS =====
const CONTINUE_COST=5; // 5 Telegram Stars
function continueForStars(){
    // Try Telegram WebApp payment
    if(window.Telegram?.WebApp?.openInvoice){
        window.Telegram.WebApp.openInvoice('continue_'+Date.now(), (status)=>{
            if(status==='paid') revivePlayer();
        });
    } else {
        // Fallback for dev/browser — just revive
        revivePlayer();
    }
}

function revivePlayer(){
    // Give player half the debt + some coins to survive
    G.atm=Math.floor(G.currentDebt*0.6);
    G.coins=0;
    G.round=1;
    G.charms=[];
    G.hasShield=false;G.hasMagnet=false;
    G.symMult=1;G.payMult=1;
    sfx('jackpot');
    updateHUD();
    showSpinChoice();
}

// ===== DAILY BONUS =====
const DAILY_BONUS_TICKETS=5;
function checkDailyBonus(){
    const last=localStorage.getItem('dm_daily_last');
    const today=new Date().toDateString();
    const btnDaily=$('btn-daily');
    if(!last || last!==today){
        btnDaily.classList.remove('hidden');
    } else {
        btnDaily.classList.add('hidden');
    }
}

function claimDailyBonus(){
    localStorage.setItem('dm_daily_last', new Date().toDateString());
    G.tickets+=DAILY_BONUS_TICKETS;
    sfx('jackpot');
    $('btn-daily').classList.add('hidden');
    updateHUD();
}

// ===== SAVE / LOAD (localStorage) =====
function saveBestScore(){
    const prev=JSON.parse(localStorage.getItem('dm_best')||'{}');
    const score={
        deadlines:G.deadline-1,
        totalEarned:G.totalEarned,
        maxBank:G.maxBank,
        date:new Date().toISOString()
    };
    let isNew=false;
    if(!prev.deadlines || score.deadlines>prev.deadlines){
        localStorage.setItem('dm_best', JSON.stringify(score));
        isNew=true;
    }
    // Show best record
    const best=isNew?score:prev;
    const recEl=$('best-record');
    recEl.innerHTML=isNew
        ?`<span class="new-record">🏆 НОВЫЙ РЕКОРД!</span> — ${best.deadlines} дедлайнов`
        :`🏆 Рекорд: ${best.deadlines||0} дедлайнов / $${best.maxBank||0}`;
    // Show achievements
    renderAchievements();
}

function loadBestScore(){
    return JSON.parse(localStorage.getItem('dm_best')||'{"deadlines":0,"totalEarned":0,"maxBank":0}');
}

// ===== ACHIEVEMENTS =====
const ACHIEVEMENTS=[
    {id:'first_win',    emoji:'🎰', name:'Первый выигрыш',    check:()=>G.totalEarned>0},
    {id:'survive_3',    emoji:'🛡️', name:'3 дедлайна',        check:()=>(G.deadline-1)>=3},
    {id:'survive_5',    emoji:'⚔️', name:'5 дедлайнов',       check:()=>(G.deadline-1)>=5},
    {id:'survive_10',   emoji:'👑', name:'10 дедлайнов',      check:()=>(G.deadline-1)>=10},
    {id:'bank_1000',    emoji:'💰', name:'Банк $1000',        check:()=>G.maxBank>=1000},
    {id:'bank_5000',    emoji:'💎', name:'Банк $5000',        check:()=>G.maxBank>=5000},
    {id:'earned_5000',  emoji:'📈', name:'Заработано $5000',  check:()=>G.totalEarned>=5000},
    {id:'multi_match',  emoji:'🔥', name:'Мульти-комбо',      check:()=>G._hadMultiMatch},
];

function renderAchievements(){
    const el=$('achievements-list');
    el.innerHTML='';
    const unlocked=JSON.parse(localStorage.getItem('dm_achievements')||'[]');
    const newUnlocks=[];
    
    ACHIEVEMENTS.forEach(a=>{
        const wasUnlocked=unlocked.includes(a.id);
        const justUnlocked=!wasUnlocked && a.check();
        if(justUnlocked) newUnlocks.push(a.id);
        
        if(wasUnlocked || justUnlocked){
            const badge=document.createElement('div');
            badge.className='achievement'+(justUnlocked?' new':'');
            badge.textContent=a.emoji+' '+a.name;
            el.appendChild(badge);
        }
    });
    
    if(newUnlocks.length>0){
        sfx('jackpot');
        localStorage.setItem('dm_achievements', JSON.stringify([...unlocked,...newUnlocks]));
    }
}

// ===== UTILITY =====
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function shakeScreen(){dom.app.classList.add('shake');setTimeout(()=>dom.app.classList.remove('shake'),500)}
function showPopup(amt,combo,isMulti=false){
    dom.popupAmt.textContent='+$'+amt;
    dom.popupCombo.textContent=(isMulti?'🔥 МУЛЬТИ! ':'')+combo;
    dom.popupWin.classList.remove('hidden');
    dom.resultText.textContent=combo+' → +$'+amt;
    setTimeout(()=>dom.popupWin.classList.add('hidden'),isMulti?2000:1400);
}

// ===== START GAME =====
function startGame(){
    initGame();
    showSpinChoice();
}

function startRound(spins, tickets){
    G.spinsLeft=spins+G.bonusSpins;
    G.spinsThisRound=G.spinsLeft;
    G.tickets+=tickets;
    G.coins=0;
    G.tempLuck=0; G.tempLuckSpins=0; // temp luck resets each round
    G.symMult=1; G.payMult=1;
    buildGrid();
    showScreen('game');
    dom.btnSpin.disabled=false;
    dom.btnDeposit.classList.add('hidden');
    dom.resultText.textContent='';
    updateHUD();
}

// ===== EVENT LISTENERS =====
dom.btnStart.addEventListener('click',startGame);
dom.btnSpin.addEventListener('click',spin);
dom.btnDeposit.addEventListener('click',deposit);
dom.opt3.addEventListener('click',()=>startRound(3,3));
dom.opt7.addEventListener('click',()=>startRound(7,1));
dom.btnContinue.addEventListener('click',()=>{
    G.symMult=1; G.payMult=1;
    showSpinChoice();
});
dom.btnRetry.addEventListener('click',startGame);
dom.btnReroll.addEventListener('click',rerollShop);
$('lever').addEventListener('click',spin); // lever also triggers spin
$('btn-continue-stars').addEventListener('click',continueForStars);
$('btn-daily').addEventListener('click',claimDailyBonus);

// ===== TITLE SCREEN: show saved progress =====
function renderTitleScreen(){
    checkDailyBonus();
    // Show best record
    const best=loadBestScore();
    const recEl=$('title-record');
    if(best.deadlines>0){
        recEl.textContent=`🏆 Рекорд: ${best.deadlines} дедлайнов | $${best.maxBank}`;
    } else {
        recEl.textContent='';
    }
    // Update achievements button with count
    const unlocked=JSON.parse(localStorage.getItem('dm_achievements')||'[]');
    $('btn-achievements').querySelector('span').textContent=`🏆 ДОСТИЖЕНИЯ (${unlocked.length}/${ACHIEVEMENTS.length})`;
}

// ===== ACHIEVEMENTS SCREEN =====
function showAchievementsScreen(){
    const unlocked=JSON.parse(localStorage.getItem('dm_achievements')||'[]');
    
    // Progress
    $('ach-progress').textContent=`Разблокировано: ${unlocked.length} / ${ACHIEVEMENTS.length}`;
    
    // Grid
    const grid=$('ach-grid');
    grid.innerHTML='';
    ACHIEVEMENTS.forEach((a,i)=>{
        const card=document.createElement('div');
        const isUnlocked=unlocked.includes(a.id);
        card.className='ach-card'+(isUnlocked?' unlocked':' locked');
        card.style.animationDelay=(i*0.08)+'s';
        card.innerHTML=isUnlocked
            ?`<div class="ach-icon">${a.emoji}</div><div class="ach-name">${a.name}</div>`
            :`<div class="ach-icon">🔒</div><div class="ach-name">???</div>`;
        grid.appendChild(card);
    });
    
    showScreen('achievements');
}

$('btn-achievements').addEventListener('click',showAchievementsScreen);
$('btn-ach-back').addEventListener('click',()=>{showScreen('title');renderTitleScreen()});

renderTitleScreen();
