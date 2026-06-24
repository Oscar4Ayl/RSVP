let book = null;
let currentIndex = 0;
let currentChapter = 0;
let sequence = null;
let speed = 300;
let remainingTime = 0;
let readerState = "stop";

const lowSpeedDivide = 2;
const speedInc = 50;
const speedMax = 1000;

const maxNameLength = 50;

let clickableColor = "gray";
let unclickableColor = "#111";
let activeColor = "darkseagreen";


const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");

const display = document.getElementById("wordDisplay");

const multiButtonDisplay = document.getElementById("multiBtn");
const rewindButtonDisplay = document.getElementById("rwdBtn");

const navDisplay = document.getElementById("navDisplay");
const previousChapterBtn = document.getElementById("previousChapterBtn");
const nextChapterBtn = document.getElementById("nextChapterBtn");

const speedDisplay = document.getElementById("speedDisplay");
const minusSpeedBtn = document.getElementById("minusSpeedBtn");
const plusSpeedBtn = document.getElementById("plusSpeedBtn");



function uploadClick() {
	fileInput.click()
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

async function sortFile(event) {

    const file = event.target.files[0];
    if (!file) {
		return;
		}
	if (file.type === "application/epub+zip") {
		book = await loadEpub(file);
	}
	else if (file.type === "text/plain") {
		book = await loadTxt(file);
	}
	else {
		console.log(file.type);
		console.log("unexpected file type");
		return;
	}
	
	currentIndex = 0;
	currentChapter = 0;
	sequence = null;
	
	display.innerText = "Press Start";
	readerState = "pause";
	updateUI();
}

async function loadTxt(file) {
    const longName = file.name.replace(/\.txt$/i, "");
    const bookName = reduceTitle(longName, maxNameLength);
    const text = await file.text();

    const words = text
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean);

	const chaptered = false;

    const chapters = [
        {
            name: bookName,
            words
        }
    ];

    return {
        bookName,
		chaptered,
        chapters
    };
}

async function loadEpub(file) {
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
	const bookName = reduceTitle(bookTitle || longName, maxNameLength);

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
		const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
		if (words.length === 0) continue;
		
		const name =
		tocNames[fileName]
		||
		doc.querySelector("h1,h2,h3,.chapter-title,.title")
			?.textContent
			?.trim()
		||
		words.slice(0, 8).join(" ");
		
        chapters.push({name, words});
    }
	
	
	if (chapters.length > 1) {
		chaptered = true;
	}
	else {
		chaptered = false;
	}
    return { bookName, chaptered, chapters };
}










function startSequence(speed) {
	if (sequence) {
        return;
    }
	
	delay = 60000/Number(speed);
	showNextWord();
    sequence = setInterval(showNextWord, delay);
}

function stopSequence() {
	clearInterval(sequence);
    sequence = null;
}

function showNextWord() {

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
	
	
	

    display.innerText = book.chapters[currentChapter].words[currentIndex];
	updateUI();
    currentIndex++;

}



function rewindReader() {	
	readerState = "rewind";
	updateUI();
	stopSequence();
	startSequence(speed / lowSpeedDivide)
}

function rewindReturn() {
	stopSequence();
	startReader();
}

function startReader() {
   	readerState = "play";
	updateUI();
	startSequence(speed);
}

function pauseReader() {

	readerState = "pause";
	updateUI();
	stopSequence();
}

function previousChapter() {
	console.log("current index : "+String(currentIndex));
	console.log("current chapter : "+String(currentChapter));
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
	if (currentChapter >= book.chapters.length - 1) {
		return;
	}
	currentChapter += 1;
	currentIndex = 0;
	
	
	readerState = "pause";
	showNextWord();
	updateUI();
}



function multiButton() {
	if (readerState === "stop") {
		return;
	}
	else if (readerState === "ready") {
		startReader();
	}
	else if (readerState === "play") {
		pauseReader();
	}
	else if (readerState === "pause") {
		startReader();
	}
	else if (readerState === "rewind") {
		rewindReturn();
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
	else if (readerState === "ready") {
		return;
	}
	else if (readerState === "play") {
		rewindReader();
	}
	else if (readerState === "pause") {
		return;
	}
	else if (readerState === "rewind") {
		return;
	}
	else if (readerState === "chapterEnd") {
		return;
	}
	else if (readerState === "bookEnd") {
		return;
	}
	else {
		console.log("readerState error");
	}
}

function previousChapterButton() {
	if (readerState === "stop") {
		return;
	}
	else if (readerState === "ready") {
		return;
	}
	else if (readerState === "play") {
		return;
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
	else if (readerState === "ready") {
		nextChapter();
	}
	else if (readerState === "play") {
		return;
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

function minusSpeed() {
	if (speed <= speedInc) {
		return;
	}
	
	if (readerState === "play") {
		
		stopSequence();
		speed -= speedInc;
		startSequence(speed);
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
		startSequence(speed);
	}
	else if (readerState === "rewind") {
		return;
	}
	else {
		speed += speedInc;
	}
		updateUI();
}






function updateUI() {
	updateButtons();
	updateNav();
	updateSpeed();
	updateInput();
}

function updateButtons() {
	
	let multiText = "";
	let multiColor = "";
	let rewindColor = "";
		
	if (readerState === "stop") {
		multiText = "Start";
		multiColor = unclickableColor;
		rewindColor = unclickableColor;
	}
	else if (readerState === "ready") {
		multiText = "Start";
		multiColor = clickableColor;
		rewindColor = unclickableColor;
	}
	else if (readerState === "play") {
		multiText = "Pause";
		multiColor = activeColor;
		rewindColor = clickableColor;
	}
	else if (readerState === "pause") {
		multiText = "Play";
		multiColor = clickableColor;
		rewindColor = unclickableColor;
	}
	else if (readerState === "rewind") {
		multiText = "Play";
		multiColor = clickableColor;
		rewindColor = activeColor;
	}
	else if (readerState === "chapterEnd") {
		multiText = "Next Chapter";
		multiColor = clickableColor;
		rewindColor = unclickableColor;
	}
	else if (readerState === "bookEnd") {
		multiText = "Play";
		multiColor = unclickableColor;
		rewindColor = unclickableColor;
	}
	else {
		console.log("readerState error");
	}
	
	
	multiButtonDisplay.innerText = multiText;
	multiButtonDisplay.style.backgroundColor = multiColor;
	rewindButtonDisplay.style.backgroundColor = rewindColor;
}	

function updateNav() {
	navText = "Chapitre " + String(currentChapter + 1);
	navDisplay.innerText = navText;
	
	let previousChapterColor = "";
	let nextChapterColor = "";
	
	if (readerState === "stop") {
		previousChapterColor = unclickableColor;
		nextChapterColor = unclickableColor;
	}
	else if (readerState === "ready") {
		previousChapterColor = unclickableColor;
		nextChapterColor = clickableColor;
	}
	else if (readerState === "play") {
		previousChapterColor = unclickableColor;
		nextChapterColor = unclickableColor;
	}
	else if (readerState === "pause") {
		previousChapterColor = clickableColor;
		nextChapterColor = clickableColor;
		if (currentChapter <= 0) {
			if (currentIndex <= 1) {
				previousChapterColor = unclickableColor;
			}
		}
		if (currentChapter >= book.chapters.length - 1) {
			nextChapterColor = unclickableColor;
		}
	}
	else if (readerState === "rewind") {
		previousChapterColor = unclickableColor;
		nextChapterColor = unclickableColor;
	}
	else if (readerState === "chapterEnd") {
		previousChapterColor = clickableColor;
		nextChapterColor = clickableColor;
	}
	else if (readerState === "bookEnd") {
		previousChapterColor = clickableColor;
		nextChapterColor = unclickableColor;
	}
	else {
		console.log("readerState error");
	}
	
	
	previousChapterBtn.style.backgroundColor = previousChapterColor;
	nextChapterBtn.style.backgroundColor = nextChapterColor;
}

function updateSpeed() {	
	speedText = String(speed) + " WPM";
	speedDisplay.innerText = speedText;
	
	if (speed <= speedInc) {
		minusSpeedBtn.style.backgroundColor = unclickableColor;
	}	
	else {
		minusSpeedBtn.style.backgroundColor = clickableColor;
	}
	
	if (speed > speedMax - speedInc) {
		plusSpeedBtn.style.backgroundColor = unclickableColor;;
	}
	else {
		plusSpeedBtn.style.backgroundColor = clickableColor;
	}
	
	if (readerState === "stop") {
		return
	}
	if (currentIndex >= book.chapters[currentChapter].words.length) {
		remainingTime = "TERMINE"
	}
	else {
		const remainingWords = book.chapters[currentChapter].words.length - currentIndex;
		remainingTime = String(Math.ceil(remainingWords / speed)) + " min";
	
	}
}

function updateInput() {
	
	if (book.chapters.length <= 1) {
		const inputText = book.bookName + " | " + remainingTime;
		uploadBtn.style.backgroundColor = activeColor;
		uploadBtn.innerText = inputText;
	}
	else {
		const inputText = 
		book.bookName + " | " + book.chapters[currentChapter].name+ " | " + remainingTime;
		
		uploadBtn.style.backgroundColor = activeColor;
		uploadBtn.innerText = inputText;
	}
}



function noSelect() {
	book = {
		bookName: "Petit Voyage",
		chaptered: true,
		chapters: [
			{
				name: "Titre",
				words: [
					"Petit",
					"voyage",
					"d'un",
					"enfant",
					"curieux",
					"vers",
					"un",
					"monde",
					"nouveau",
					"lointain"
				]
			},
			{
				name: "Chapitre 1 - Le départ",
				words: [
					"Le",
					"matin",
					"Paul",
					"prépare",
					"son",
					"sac",
					"avec",
					"soin",
					"avant",
					"de",
					"quitter",
					"sa",
					"maison",
					"familiale",
					"pour",
					"commencer",
					"une",
					"grande",
					"aventure",
					"seul",
					"sur",
					"les",
					"routes",
					"du",
					"monde",
					"Il",
					"observe",
					"les",
					"nuages",
					"blancs",
					"qui",
					"passent",
					"lentement",
					"dans",
					"le",
					"ciel",
					"calme",
					"et",
					"imagine",
					"les",
					"découvertes",
					"qui",
					"l'attendent",
					"durant",
					"son",
					"long",
					"chemin",
					"vers",
					"l'inconnu"
				]
			},
			{
				name: "Chapitre 2 - La route",
				words: [
					"Paul",
					"marche",
					"pendant",
					"des",
					"heures",
					"sur",
					"un",
					"sentier",
					"entouré",
					"de",
					"grands",
					"arbres",
					"verts",
					"Il",
					"entend",
					"les",
					"oiseaux",
					"chanter",
					"près",
					"des",
					"rivières",
					"claires",
					"et",
					"regarde",
					"les",
					"fleurs",
					"colorées",
					"dans",
					"les",
					"champs",
					"Chaque",
					"jour",
					"apporte",
					"une",
					"nouvelle",
					"surprise",
					"et",
					"Paul",
					"comprend",
					"que",
					"le",
					"voyage",
					"est",
					"aussi",
					"important",
					"que",
					"la",
					"destination"
				]
			},
			{
				name: "Chapitre 3 - La découverte",
				words: [
					"Après",
					"plusieurs",
					"jours",
					"de",
					"marche",
					"Paul",
					"découvre",
					"un",
					"petit",
					"village",
					"caché",
					"derrière",
					"une",
					"montagne",
					"ancienne",
					"Les",
					"habitants",
					"accueillent",
					"le",
					"voyageur",
					"avec",
					"joie",
					"et",
					"lui",
					"racontent",
					"des",
					"histoires",
					"sur",
					"leur",
					"vallée",
					"magique",
					"Paul",
					"garde",
					"ces",
					"souvenirs",
					"précieux",
					"dans",
					"son",
					"cœur",
					"et",
					"continue",
					"son",
					"chemin",
					"plus",
					"fort",
					"qu'avant",
					"grâce",
					"à",
					"son",
					"aventure"
				]
			}
		]
	};
	uploadBtn.style.backgroundColor = activeColor;
	uploadBtn.innerText = book.bookName;
		
	display.innerText = "Press Start";
	readerState = "pause";
}



fileInput.addEventListener("change",sortFile);
uploadBtn.onclick = uploadClick;

multiButtonDisplay.onclick = multiButton;
rewindButtonDisplay.onclick = rewindButton;

previousChapterBtn.onclick = previousChapterButton;
nextChapterBtn.onclick = nextChapterButton;

minusSpeedBtn.onclick = minusSpeed;
plusSpeedBtn.onclick = plusSpeed;



//noSelect();

updateUI();
