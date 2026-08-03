


let book = null;
let bookFileName = null;
let currentChapter = 0;
let currentIndex = 0;
let rewindFlag = 0;
let longPauseFlag = false;


let sequence = null;
let running = false;
let readerState = "stop";


let speed = 400;
const speedInc = 50;
const speedMax = 1000;
const rewindTime = 4;
const lowSpeedCoef = 0.6;

const punctDelay = 2.2;

const maxNameLength = 35;


let swipeStartX = 0;
let swipeStartY = 0;
const swipeThreshold = 80;





let currentColorTheme = 0;
const colorThemes = [
{
	bgColor: "#000",
	textColor: "#bbb",
	subtleTextColor: "#999",
	orpColor: "#F54927",
	menuColor: "#111",
	barColor: "#282828",
	clickableColor: "#444",	
	unclickableColor: "#181818",
	activeColor: "#334B50"
},
{
    bgColor: "#0E0E0E",
    textColor: "#C6C0B8",
    subtleTextColor: "#7F786F",
    orpColor: "#F35A2A",
    menuColor: "#151515",
    barColor: "#272727",
    clickableColor: "#3F3F3F",
    unclickableColor: "#1C1C1C",
    activeColor: "#3F5C63"
},
{
    bgColor: "#F3EAD6",
    textColor: "#40372C",
    subtleTextColor: "#B0A083",
    orpColor: "#D93C1F",
    menuColor: "#DED2BA",
    barColor: "#CFC0A3",
    clickableColor: "#B9A98A",
    unclickableColor: "#D9CCB5",
    activeColor: "#7D9EA8"
},
{
    bgColor: "#0E1621",
    textColor: "#DDE7F2",
    subtleTextColor: "#556272",
    orpColor: "#4FC3F7",
    menuColor: "#162232",
    barColor: "#243447",
    clickableColor: "#35506B",
    unclickableColor: "#1A2633",
    activeColor: "#4F8EA7"
}
];


const root = document.documentElement;

const app = document.getElementById("reader");

const CURRENT_BOOK_KEY = "rsvpcurrent";
const BOOKS_KEY = "rsvpbooks";
const resetBookDelay = 50;

const topInfo = document.getElementById("topInfo");
const bottomInfo = document.getElementById("bottomInfo");

const display = document.getElementById("wordDisplay");
const menuBtn = document.getElementById("menuBtn");
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const colorBtn = document.getElementById("colorBtn");

const tapZoneLeft = document.getElementById("tap-zone-left");
const tapZoneCenter = document.getElementById("tap-zone-center");
const tapZoneRight = document.getElementById("tap-zone-right");




const menuPanel = document.getElementById("menuPanel");
const closeMenuBtn = document.getElementById("closeMenuBtn");

const multiButtonDisplay = document.getElementById("multiBtn");
const rewindButtonDisplay = document.getElementById("rwdBtn");

const storeBtn = document.getElementById("storeBtn");

const previousChapterBtn = document.getElementById("previousChapterBtn");
const nextChapterBtn = document.getElementById("nextChapterBtn");
const previousWordBtn = document.getElementById("previousWordBtn");
const nextWordBtn = document.getElementById("nextWordBtn");

const speedDisplay = document.getElementById("speedDisplay");
const minusSpeedBtn = document.getElementById("minusSpeedBtn");
const plusSpeedBtn = document.getElementById("plusSpeedBtn");

const menuInfoDisplay1 = document.getElementById("menuInfoDisplay1");
const menuInfoDisplay2 = document.getElementById("menuInfoDisplay2");
const menuInfoDisplay3 = document.getElementById("menuInfoDisplay3");



// STORING SETTINGS & POS

function loadBooksJSON() {
    const data = localStorage.getItem(BOOKS_KEY);

    if (!data) {
        return {};
    }

	if (data === {}) {
        return {};
    }

    return JSON.parse(data);
}

function loadCurrentBook() {
	const data = localStorage.getItem(CURRENT_BOOK_KEY);

    if (!data) {
        return "no_book";
    }

    return data;
}

function storeSettings() {
	booksJSON = loadBooksJSON();
	settings = {
		lastSpeed: speed,
		lastColorTheme: currentColorTheme,
		lastChapter: currentChapter,
		lastIndex: currentIndex - 1,
		lastOpened: new Date().toISOString()
	};
	booksJSON[bookFileName] = settings;
	localStorage.setItem(CURRENT_BOOK_KEY, bookFileName);
	localStorage.setItem(BOOKS_KEY, JSON.stringify(booksJSON));
}




// TEXT PROCESSING

function tokenizeRaw(text) {
    const tokens = [];
    //const regex = /\.\.\.|…|[«»(){}\[\]—–-]|[\wÀ-ÿ]+(?:[-][\wÀ-ÿ]+)*|[.,;:!?]|\s+/gu;
    //const regex = /\.\.\.|…|[«»(){}\[\]—–-]|[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*|[.,;:!?%]|\s+/gu;
	//const regex = /\.\.\.|…|[«»"(){}\[\]—–-]|\d+(?:[.,]\d+)?%?|[\p{L}]+(?:[-'’][\p{L}]+)*|[.,;:!?%]|\s+/gu;
	const regex = /\.\.\.|…|[«»"(){}\[\]—–-]|[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*(?:[.,]\p{N}+)?%?|[.,;:!?%#$€]|\s+/gu;
	
    let pendingSpaces = "";
    let previousToken = null;

    for (const match of text.matchAll(regex)) {
        const value = match[0];

        if (/^\s+$/.test(value)) {
            pendingSpaces += value;
            continue;
        }
		

        const token = {
            value,
            spaceBefore: pendingSpaces,
            spaceAfter: ""
        };
		

        if (previousToken) {
            previousToken.spaceAfter = pendingSpaces;
        }

        tokens.push(token);

        previousToken = token;
        pendingSpaces = "";
    }

    if (previousToken && pendingSpaces) {
        previousToken.spaceAfter = pendingSpaces;
    }

    return tokens;
}

function getORPIndex(wordLength) {
  if (wordLength <= 1) return 0;

  // Position du milieu (index gauche pour les longueurs paires)
  const middle = Math.floor((wordLength - 1) / 2);

  // Décalage vers la gauche pour les mots longs
  if (wordLength >= 6) {
    return middle - 1;
  }

  return middle;
}

function formatText(text) {
    const OPENERS = new Set([
        "«", "\"", "'", "(", "[", "{",
        "—", "–", "-", "#"
    ]);

    const CLOSERS = new Set([
        "»", "\"", "'", ")", "]", "}",
        ".", ",", ";", ":", "!", "?",
        "…", "...", "%", "$", "€"
    ]);
	
	const SENTENCE_ENDERS = new Set([
		".", "!", "?", "…", ":", ";","…", "..."
	]);

    const raw = tokenizeRaw(text);

    const result = [];

    let pendingPrefix = "";

    for (const token of raw) {

		if (OPENERS.has(token.value)) {
			pendingPrefix += token.value + token.spaceAfter;
			continue;
		}

		if (CLOSERS.has(token.value)) {
			if (result.length) {
				result[result.length - 1].value += token.spaceBefore + token.value;
				
			}
			if (SENTENCE_ENDERS.has(token.value)) {
				if (result.length) {
					result[result.length - 1].delayMultiplier = punctDelay;
				}
			}
			continue;
		}
		
		
		
		let value = pendingPrefix + token.value;
		let orp = getORPIndex(token.value.length) + pendingPrefix.length;
		
        	
		
        result.push({value, orp, delayMultiplier:1});

        pendingPrefix = "";
    }

    return result;
}

function reduceTitle(title, maxLength) {

	if (title.length <= maxLength) {
		return title;
	}
	else {
		beginning = title.substring(0, maxLength - 15);
		middle = " // ";
		end = title.substring(title.length - 15, title.length);
		return beginning+middle+end;
	}
}



// FILE PROCESSING

async function loadFile(event) {

    const file = event.target.files[0];
    if (!file) {
		return;
		}
	if (file.type === "application/epub+zip") {
		book = await processEpub(file);
		bookFileName = file.name;
	}
	else if (file.type === "text/plain") {
		book = await processTxt(file);
		bookFileName = file.name;
	}
	else {
		console.log("unexpected file type");
		return;
	}
	
	const bookList = loadBooksJSON();
	console.log(bookList);
	console.log(bookFileName);
	if (bookFileName in bookList) {
		const lastOpened = new Date(bookList[file.name].lastOpened);
		const now = new Date();
		const daysElapsed = (now - lastOpened) / (1000 * 60 * 60 * 24);
		if (daysElapsed > 50) {
			console.log("Plus de 50 jours");
			currentIndex = 0;
			currentChapter = 0;
		}
		else {
			const b = bookList[bookFileName];
			speed = b.lastSpeed
			currentColorTheme = b.lastColorTheme
			currentChapter = b.lastChapter
			currentIndex = b.lastIndex
		}
	}
	else {
		currentIndex = 0;
		currentChapter = 0;
	}
	
	sequence = null;
	readerState = "pause";
	showNextWord();
	updateUI();
}

async function processTxt(file) {
    const longName = file.name.replace(/\.txt$/i, "");
    const bookName = reduceTitle(longName, maxNameLength);
    const text = await file.text();

    const words = formatText(text);

    const chapters = [
        {
            name: longName,
            words
        }
    ];

    return {
        bookName,
        chapters
    };
}

async function processEpub(file) {
    const zip = await JSZip.loadAsync(file);
	const longName = file.name.replace(/\.epub$/i, "");
    const chapters = [];
	let chaptered = null;
    let tocNames = {};


    const container = await zip.files["META-INF/container.xml"].async("string");
    const containerDoc = new DOMParser().parseFromString(container, "text/xml");

    const opfPath = containerDoc
        .querySelector("rootfile")
        .getAttribute("full-path");

    const opf = await zip.files[opfPath].async("string");
    const opfDoc = new DOMParser().parseFromString(opf, "text/xml");
	
	
	const bookTitle = opfDoc.querySelector("metadata title")?.textContent?.trim();
	const bookName = (bookTitle || longName);

    const manifest = {};
    opfDoc.querySelectorAll("manifest item").forEach(item => {
        manifest[item.getAttribute("id")] = item.getAttribute("href");
    });

    const basePath = opfPath.substring(0, opfPath.lastIndexOf("/") + 1);
    const spineItems = opfDoc.querySelectorAll("spine itemref");
	
	const ncxItem = [...opfDoc.querySelectorAll("manifest item")]
    .find(item => item.getAttribute("media-type") === "application/x-dtbncx+xml");

	if (ncxItem) {
		const ncxPath = basePath + ncxItem.getAttribute("href");

		const ncx = await zip.files[ncxPath].async("string");
		const ncxDoc = new DOMParser().parseFromString(ncx, "text/xml");

		ncxDoc.querySelectorAll("navPoint").forEach(point => {
		const title = point.querySelector("navLabel text")?.textContent?.trim();
		const src = point.querySelector("content")?.getAttribute("src");

		if (title && src) {
			tocNames[basePath + src] = title;
		}
		});
	}
	
    for (const item of spineItems) {
        const id = item.getAttribute("idref");
        const href = manifest[id];

        const fileName = basePath + href;

        if (!zip.files[fileName]) continue;

        const html = await zip.files[fileName].async("string");
        const doc = new DOMParser().parseFromString(html, "text/html");

        const text = doc.body?.textContent?.replace(/\s+/g, " ").trim() || "";
		const words = formatText(text);
		if (words.length === 0) continue;
		

		const backupTitle = "";
		
		const name =
		tocNames[fileName]
		||
		doc.querySelector("h1,h2,h3,.chapter-title,.title")
			?.textContent
			?.trim()
		||
		backupTitle;
		
        chapters.push({name, words});
    }
	
    return { bookName, chapters };
}



// READER FUNCTIONS

function startReader() {
   	readerState = "play";
	updateUI();
	showNextWord();
	startSequence(speed);
}

function pauseReader() {

	readerState = "pause";
	updateUI();
	stopSequence();
	storeSettings();
}

function startSequence(speed) {
	if (sequence) {
        return;
    }
	
	delay = 60000 / Number(speed);
    sequence = setInterval(showNextWord, delay);
}

function stopSequence() {
	clearInterval(sequence);
    sequence = null;
}

function showNextWord() {

	// CHECK CHAPTER END

    if (currentIndex >= book.chapters[currentChapter].words.length) {
        pauseReader();
		readerState = "chapterEnd";
		if (currentChapter >= book.chapters.length - 1) {
			pauseReader();
			readerState = "bookEnd";
		}
		updateUI();
		return;
    }
	
	
	// CHECK REWIND FLAG
	
	if (readerState === "rewind") {
		if (currentIndex >= rewindFlag) {
			rewindReturn();
			return;
		}
	}
	
	const token = book.chapters[currentChapter].words[currentIndex];
    const wordBlock = token.value;
	const orpIndex = token.orp;
	const delayMultiplier = (token.delayMultiplier || 1);
	
	const before = wordBlock.slice(0, orpIndex);
	const orp = wordBlock[orpIndex];
	
	const after = wordBlock.slice(orpIndex + 1);

	display.innerHTML = `
	  <span class="before">${before}</span>
	  <span class="orp">${orp}</span>
	  <span class="after">${after}</span>
	`;
	
	const orpWidth = document.querySelector(".orp").offsetWidth;

	document.querySelector(".before").style.right =
	  `calc(50% + ${orpWidth / 2}px)`;

	document.querySelector(".after").style.left =
	  `calc(50% + ${orpWidth / 2}px)`;
	
	updateUI();
	currentIndex++;
	
	
	
	if (longPauseFlag) {
		longPauseFlag = false;
		if (readerState === "play") {
			startSequence(speed);
		}
		else if (readerState === "rewind") {
			const rewindSpeed = Math.max(speedInc, Math.ceil(speed * lowSpeedCoef));
			startSequence(rewindSpeed);
		}
	}	
	
	if (delayMultiplier > 1) {
		if (readerState === "play") {
			longPauseFlag = true;
			stopSequence();
			const delay = delayMultiplier * 60000 / Number(speed);
			setTimeout(showNextWord, delay);
		}
		else if (readerState === "rewind") {
			longPauseFlag = true;
			stopSequence();
			const rewindSpeed = Math.max(speedInc, Math.ceil(speed * lowSpeedCoef));
			const delay = delayMultiplier * 60000 / Number(rewindSpeed);
			setTimeout(showNextWord, delay);
		}
	}

    

}



// HANDLING REWINDING

function rewindReader() {	
	
	if (currentIndex <= 1) 
		{return;}

	stopSequence();
	
	const rewindWordCount = Math.ceil(speed * (rewindTime / 60));
	const targetIndex = Math.max(0, currentIndex - rewindWordCount);
	
	
	
	if (readerState != "rewind") {
		rewindFlag = currentIndex
	}
	currentIndex = targetIndex;
	
	readerState = "rewind";
	updateUI();
	showNextWord();
	startSequence(Math.max(speedInc, Math.ceil(speed * lowSpeedCoef)));
}

function rewindPause() {
	pauseReader();
	rewindFlag = 0;
}

function rewindReturn() {
	rewindPause();
	startReader();
}


// NAV FUNCTIONS

function previousChapter() {
	stopSequence();
	if (currentIndex <= 1) {
		if (currentChapter <= 0) {
			return;
		}
		currentChapter -= 1;
		currentIndex = 0;
	}
	else if (currentIndex > 1) {
		currentIndex = 0;
	}


	readerState = "pause";
	showNextWord();
	updateUI();
}

function nextChapter() {
	stopSequence();
	if (currentChapter >= book.chapters.length - 1) {
		return;
	}
	currentChapter += 1;
	currentIndex = 0;
	
	
	readerState = "pause";
	showNextWord();
	updateUI();
}

function previousWord() {
	
	stopSequence();
	if (currentIndex <= 1) {
		if (currentChapter > 0) {
			currentChapter -= 1;
			currentIndex = book.chapters[currentChapter].words.length - 1;
		}
		else {
			return;
		}
	}
	else {
		currentIndex -= 2;
	}
	
		
	
	showNextWord();
	readerState = "pause";
	updateUI();
}

function nextWord() {
	stopSequence();
	showNextWord();
	
	readerState = "pause";
	updateUI();
}






// VISUAL FUNCTIONS, BUTTONS, DISPLAYS

function updateUI() {
	updateAction();
	updateNav();
	updateSpeed();
	updateMenuInfo();
	updatePageInfo();
	updateCSSColors();
}

function updateAction() {
	
	let multiText = "";
	let multiColor = "";
	let rewindColor = "";
	
	const t = colorThemes[currentColorTheme]
		
	if (readerState === "stop") {
		multiText = "Start";
		multiColor = t.unclickableColor;
		rewindColor = t.unclickableColor;
	}
	else if (readerState === "play") {
		multiText = "Pause";
		multiColor = t.activeColor;
		rewindColor = t.clickableColor;
	}
	else if (readerState === "pause") {
		multiText = "Play";
		multiColor = t.clickableColor;
		if (currentIndex <= 1){
			rewindColor = t.unclickableColor;
		} 
		else {
			rewindColor = t.clickableColor;
		}
	}
	
	else if (readerState === "rewind") {
		multiText = "Play";
		multiColor = t.clickableColor;
		rewindColor = t.activeColor;
	}
	else if (readerState === "chapterEnd") {
		multiText = "Next Chapter";
		multiColor = t.clickableColor;
		rewindColor = t.clickableColor;
	}
	else if (readerState === "bookEnd") {
		multiText = "Play";
		multiColor = t.unclickableColor;
		rewindColor = t.clickableColor;
	}
	else {
		console.log("readerState error");
	}
	
	
	multiButtonDisplay.innerText = multiText;
	multiButtonDisplay.style.backgroundColor = multiColor;
	rewindButtonDisplay.style.backgroundColor = rewindColor;
}	

function updateNav() {
	
	const t = colorThemes[currentColorTheme]
	
	let previousChapterColor = "";
	let nextChapterColor = "";
	let previousWordColor = "";
	let nextWordColor = "";
	
	if (readerState === "stop") {
		previousChapterColor = t.unclickableColor;
		nextChapterColor = t.unclickableColor;
		previousWordColor = t.unclickableColor;
		nextWordColor = t.unclickableColor;
	}
	else if (readerState === "play") {
		previousChapterColor = t.clickableColor;
		nextChapterColor = t.clickableColor;
		previousWordColor = t.clickableColor;
		nextWordColor = t.clickableColor;
	}
	else if (readerState === "pause") {
		previousChapterColor = t.clickableColor;
		nextChapterColor = t.clickableColor;
		previousWordColor = t.clickableColor;
		nextWordColor = t.clickableColor;
		
		if (currentIndex <= 1) {
			if (currentChapter <= 0) {
				previousWordColor = t.unclickableColor
				previousChapterColor = t.unclickableColor;
			}
		}
		if (currentChapter >= book.chapters.length - 1) {
			nextChapterColor = t.unclickableColor;
		}
		
		
		
	}
	else if (readerState === "rewind") {
		previousChapterColor = t.unclickableColor;
		nextChapterColor = t.unclickableColor;
		previousWordColor = t.unclickableColor;
		nextWordColor = t.unclickableColor;
	}
	else if (readerState === "chapterEnd") {
		previousChapterColor = t.clickableColor;
		nextChapterColor = t.clickableColor;
		previousWordColor = t.clickableColor;
		nextWordColor = t.clickableColor;
	}
	else if (readerState === "bookEnd") {
		previousChapterColor = t.clickableColor;
		nextChapterColor = t.unclickableColor;
		previousWordColor = t.clickableColor;
		nextWordColor = t.unclickableColor;
	}
	else {
		console.log("readerState error");
	}
	
	
	previousChapterBtn.style.backgroundColor = previousChapterColor;
	nextChapterBtn.style.backgroundColor = nextChapterColor;
	previousWordBtn.style.backgroundColor = previousWordColor;
	nextWordBtn.style.backgroundColor = nextWordColor;
	

}

function updateSpeed() {	

	const t = colorThemes[currentColorTheme]
	
	speedText = String(speed) + " WPM";
	speedDisplay.innerText = speedText;
	
	if (speed <= speedInc) {
		minusSpeedBtn.style.backgroundColor = t.unclickableColor;
	}	
	else {
		minusSpeedBtn.style.backgroundColor = t.clickableColor;
	}
	
	if (speed > speedMax - speedInc) {
		plusSpeedBtn.style.backgroundColor = t.unclickableColor;;
	}
	else {
		plusSpeedBtn.style.backgroundColor = t.clickableColor;
	}
	
	

}

function calcRemainingTimeText() {
	
	let remainingTimeText = "";
	let remainingWords = 0;
	let remainingTime = 0;
	
	if (currentIndex >= book.chapters[currentChapter].words.length) {
		remainingTimeText = "Partie "+ (currentChapter + 1) +" : Terminée";
	}
	else {
		remainingWords = book.chapters[currentChapter].words.length - currentIndex;
		remainingTime = Math.ceil(remainingWords / speed);
		if (remainingTime <= 1) {
			remainingTimeText = remainingTime + " minute restante";
		}
		else {
			remainingTimeText = remainingTime + " minutes restantes";
		}
	}
	
	return remainingTimeText;
}

function calcRewindTimeText() {
	
	const rewindSpeed = speed * lowSpeedCoef;
	const remainingRewindWords = Math.max(0, rewindFlag - currentIndex)
	const rewindTime = Math.ceil(remainingRewindWords / (rewindSpeed / 60))
	if (rewindTime <= 1) {
		rewindTimeText = rewindTime + " seconde restante";
	}
	else {
		rewindTimeText = rewindTime + " secondes restantes";
	}
	return rewindTimeText
}
	
function updateMenuInfo() {
	if (readerState === "stop") return;
	
	if (book.chapters.length <= 1) {
		const infoText1 = book.bookName;
		
		const infoText2 = "";
		
		const infoText3 = String(currentIndex) + " / " + 
		String(book.chapters[currentChapter].words.length);
		
		
		menuInfoDisplay1.innerText = infoText1;
		menuInfoDisplay2.innerText = infoText2;
		menuInfoDisplay3.innerText = infoText3;
	}
	else {
		const infoText1 = book.bookName

		const infoText2 = "Partie " + String(currentChapter + 1) 
		+ " / " + String(book.chapters.length)
		+ " : " + book.chapters[currentChapter].name;

		const infoText3 = "Mot " + String(currentIndex) + " / " + 
		String(book.chapters[currentChapter].words.length);
		
		
		menuInfoDisplay1.innerText = infoText1;
		menuInfoDisplay2.innerText = infoText2;
		menuInfoDisplay3.innerText = infoText3;
	}
	

}
	
function updatePageInfo() {
	
	let topText = "";
	let bottomText = "";

	if (readerState === "stop") {
		topText = "Chargez un livre (.txt / .epub)";
		bottomText = "Lecteur RSVP"
		topInfo.innerText = topText;
		bottomInfo.innerText = bottomText;
		return;
	}
	
	let bottomNavText = "";
	if (book.chapters.length <= 1) {
		bottomNavText = book.bookName;
	}
	else{
		if (book.chapters[currentChapter].name === "") {
			bottomNavText = "Partie " + String(currentChapter + 1) 
			+ " / " + String(book.chapters.length)
			+ " - (" + currentIndex + " / "
			+ book.chapters[currentChapter].words.length + ")";
		}
		else {
			bottomNavText = "Partie " + String(currentChapter + 1) 
			+ " / " + String(book.chapters.length) + " : "
			+ book.chapters[currentChapter].name
			+ " - (" + currentIndex + " / "
			+ book.chapters[currentChapter].words.length + ")";
		}
	}

	
	
	if (readerState === "play") {
		topText = "Lecture (" + speed + " WPM) - " + calcRemainingTimeText();
		bottomText = bottomNavText;
	}
	else if (readerState === "pause") {
		topText = "Pause - " + calcRemainingTimeText();
		bottomText = bottomNavText;
	}
	else if (readerState === "rewind") {
		topText = "Mode Rewind - " + calcRewindTimeText();
		bottomText = bottomNavText;
	}
	else if (readerState === "chapterEnd") {
		topText = "Partie Terminée";
		bottomText = bottomNavText;
	}
	else if (readerState === "bookEnd") {
		topText = "Livre Terminé";
		bottomText = "";
	}
	else {
		console.log("readerState error");
	}	

	topInfo.innerText = topText;
	bottomInfo.innerText = bottomText;
}	
	
function updateCSSColors() {
	const t = colorThemes[currentColorTheme];
    root.style.setProperty("--bgColor", t.bgColor);
    root.style.setProperty("--textColor", t.textColor);
    root.style.setProperty("--subtleTextColor", t.subtleTextColor);
    root.style.setProperty("--orpColor", t.orpColor);
    root.style.setProperty("--menuColor", t.menuColor);
    root.style.setProperty("--barColor", t.barColor);
    root.style.setProperty("--clickableColor", t.clickableColor);
    root.style.setProperty("--unclickableColor", t.unclickableColor);
    root.style.setProperty("--activeColor", t.activeColor);
}






// MENU PANEL FUNCTIONS

function openMenu() {
	if (readerState !== "stop") pauseReader();
	
    menuPanel.classList.add("open");
	
    menuBtn.classList.add("hidden");
    topInfo.classList.add("hidden");
    bottomInfo.classList.add("hidden");
    uploadBtn.classList.add("hidden");
    colorBtn.classList.add("hidden");
	
	tapZoneLeft.classList.add("disabled");
	tapZoneCenter.classList.add("disabled");
	tapZoneRight.classList.add("disabled");
}

function closeMenu() {
    menuPanel.classList.remove("open");
    menuBtn.classList.remove("hidden");
    topInfo.classList.remove("hidden");
    bottomInfo.classList.remove("hidden");
    uploadBtn.classList.remove("hidden");
    colorBtn.classList.remove("hidden");
	tapZoneLeft.classList.remove("disabled");
	tapZoneCenter.classList.remove("disabled");
	tapZoneRight.classList.remove("disabled");
}






// HANDLE BUTTON EVENTS

function multiButton() {
	if (readerState === "stop") {
		uploadClick();
	}
	else if (readerState === "play") {
		pauseReader();
	}
	else if (readerState === "pause") {
		startReader();
	}
	else if (readerState === "rewind") {
		rewindPause()
	}
	else if (readerState === "chapterEnd") {
		nextChapter();
	}
	else if (readerState === "bookEnd") {
		return;
	}
	else {
		console.log("readerState error");
	}
}

function rewindButton() {
	if (readerState === "stop") {
		return;
	}
	else if (readerState === "play") {
		rewindReader();
	}
	else if (readerState === "pause") {
		rewindReader();
	}
	else if (readerState === "rewind") {
		rewindReader();
	}
	else if (readerState === "chapterEnd") {
		rewindReader();
	}
	else if (readerState === "bookEnd") {
		rewindReader();
	}
	else {
		console.log("readerState error");
	}
}

function previousChapterButton() {
	if (readerState === "stop") {
		return;
	}
	else if (readerState === "play") {
		previousChapter();
	}
	else if (readerState === "pause") {
		previousChapter();		
	}
	else if (readerState === "rewind") {
		return;
	}
	else if (readerState === "chapterEnd") {
		previousChapter();		
	}
	else if (readerState === "bookEnd") {
		previousChapter();		
	}
	else {
		console.log("readerState error");
	}	
}

function nextChapterButton() {
	if (readerState === "stop") {
		return;
	}
	else if (readerState === "play") {
		nextChapter();
	}
	else if (readerState === "pause") {
		nextChapter();		
	}
	else if (readerState === "rewind") {
		return;
	}
	else if (readerState === "chapterEnd") {
		nextChapter();		
	}
	else if (readerState === "bookEnd") {
		return;		
	}
	else {
		console.log("readerState error");
	}	
}

function previousWordButton() {
	if (readerState === "stop") {
		return;
	}
	else if (readerState === "play") {
		previousWord();
	}
	else if (readerState === "pause") {
		previousWord();		
	}
	else if (readerState === "rewind") {
		return;
	}
	else if (readerState === "chapterEnd") {
		previousWord();	
	}
	else if (readerState === "bookEnd") {
		previousWord();			
	}
	else {
		console.log("readerState error");
	}
}

function nextWordButton() {
	if (readerState === "stop") {
		return;
	}
	else if (readerState === "play") {
		nextWord();
	}
	else if (readerState === "pause") {
		nextWord();		
	}
	else if (readerState === "rewind") {
		return;
	}
	else if (readerState === "chapterEnd") {
		nextChapter();		
	}
	else if (readerState === "bookEnd") {
		return;		
	}
	else {
		console.log("readerState error");
	}
}

function minusSpeed() {
	if (speed <= speedInc) {
		return;
	}
	
	if (readerState === "play") {
		
		stopSequence();
		speed -= speedInc;
		startReader();
	}
	else if (readerState === "rewind") {
		return;
	}
	else {
		speed -= speedInc;
	}
		updateUI();
}

function plusSpeed() {
	if (speed > speedMax - speedInc) {
		return;
	}
	
	if (readerState === "play") {
		
		stopSequence();
		speed += speedInc;
		startReader();
	}
	else if (readerState === "rewind") {
		return;
	}
	else {
		speed += speedInc;
	}
		updateUI();
}

function colorButton() {
	if (currentColorTheme >= colorThemes.length - 1) {
		currentColorTheme = 0;
	}
	else {
		currentColorTheme++
	}
	updateUI();
}

function storeButton() {
	if (readerState === "stop") {
		return;
	}
	else if (readerState === "play") {
		storeSettings();
	}
	else if (readerState === "pause") {
		storeSettings();
	}
	else if (readerState === "rewind") {
		storeSettings();
	}
	else if (readerState === "chapterEnd") {
		storeSettings();
	}
	else if (readerState === "bookEnd") {
		currentChapter = 0;
		currentIndex = 0;
		storeSettings();
		updateUI();
	}
	else {
		console.log("readerState error");
	}
}




function touchStart (event) {
    const touch = event.touches[0];
    swipeStartX = touch.clientX;
    swipeStartY = touch.clientY;
}

function touchEnd (event) {
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - swipeStartX;
    const deltaY = touch.clientY - swipeStartY;


    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // horizontal swipe
        if (deltaX > swipeThreshold) {
            swipeRight();
        } 
		else if (deltaX < -swipeThreshold) {
            swipeLeft();
        }
    } 
	else {
        // vertical swipe
        if (deltaY > swipeThreshold) {
            swipeDown();
        } 
		else if (deltaY < -swipeThreshold) {
            swipeUp();
        }
    }
}

function swipeUp() {
	openMenu();
}

function swipeDown() {
	closeMenu();
}

function swipeLeft() {
	nextChapterButton();
}

function swipeRight() {
	rewindButton();
}








// BUTTON EVENTS

menuBtn.addEventListener("click", openMenu);
closeMenuBtn.addEventListener("click", closeMenu);

colorBtn.onclick = colorButton;

multiButtonDisplay.onclick = multiButton;
rewindButtonDisplay.onclick = rewindButton;

previousChapterBtn.onclick = previousChapterButton;
nextChapterBtn.onclick = nextChapterButton;
previousWordBtn.onclick = previousWordButton;
nextWordBtn.onclick = nextWordButton;

minusSpeedBtn.onclick = minusSpeed;
plusSpeedBtn.onclick = plusSpeed;

fileInput.addEventListener("change",loadFile);
function uploadClick() {fileInput.click();}
uploadBtn.onclick = uploadClick;

storeBtn.onclick = storeButton;

tapZoneLeft.addEventListener("click", previousWordButton);
tapZoneCenter.addEventListener("click", multiButton);
tapZoneRight.addEventListener("click", nextWordButton);

app.addEventListener("touchstart", touchStart);
app.addEventListener("touchend", touchEnd);


updateUI();
//localStorage.setItem(BOOKS_KEY, JSON.stringify({}));
//openMenu();