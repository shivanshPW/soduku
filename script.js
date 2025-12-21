document.addEventListener("DOMContentLoaded", () => {
  const boardElement = document.getElementById("sudoku-board");
  const numpad = document.querySelector(".numpad");
  const newGameBtn = document.getElementById("new-game-btn");
  const undoBtn = document.getElementById("undo-btn");
  const eraseBtn = document.getElementById("erase-btn");
  const noteBtn = document.getElementById("note-btn");
  const submitBtn = document.getElementById("submit-btn");
  const themeToggle = document.getElementById("theme-toggle");
  const messageElement = document.getElementById("message");
  const diffBtns = document.querySelectorAll(".diff-btn");
  const timerElement = document.getElementById("timer");
  const submitButton = document.getElementById("submit-btn");

  let board = [];
  let solution = [];
  let initialBoard = [];
  let history = [];
  let selectedCell = null;
  let difficulty = "easy";
  let timerInterval;
  let seconds = 0;
  let isNotesMode = false;

  // Initialize the game
  initGame();

  // Event Listeners
  newGameBtn.addEventListener("click", () => startNewGame());
  submitBtn.addEventListener("click", submitGame);

  undoBtn.addEventListener("click", undoMove);
  eraseBtn.addEventListener("click", () => {
    if (selectedCell) fillCell(selectedCell, 0);
  });
  noteBtn.addEventListener("click", () => {
    isNotesMode = !isNotesMode;
    noteBtn.classList.toggle("active");
    showMessage(isNotesMode ? "Notes Mode On" : "Notes Mode Off");
  });

  themeToggle.addEventListener("click", toggleTheme);

  diffBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      diffBtns.forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      difficulty = e.target.dataset.diff;
      startNewGame();
    });
  });

  numpad.addEventListener("click", (e) => {
    if (!selectedCell) return;

    if (e.target.classList.contains("num-btn")) {
      const num = parseInt(e.target.dataset.num);
      fillCell(selectedCell, num);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!selectedCell) return;

    const key = e.key;
    if (key >= "1" && key <= "9") {
      fillCell(selectedCell, parseInt(key));
    } else if (key === "Backspace" || key === "Delete") {
      fillCell(selectedCell, 0);
    } else if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)
    ) {
      moveSelection(key);
    } else if (key.toLowerCase() === "z" && (e.ctrlKey || e.metaKey)) {
      undoMove();
    }
  });

  function initGame() {
    createBoardUI();
    startNewGame();

    // Check system preference for theme
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }

  function createBoardUI() {
    boardElement.innerHTML = "";
    for (let i = 0; i < 81; i++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.index = i;
      cell.addEventListener("click", () => selectCell(cell));
      boardElement.appendChild(cell);
    }
  }

  function startNewGame() {
    stopTimer();
    seconds = 0;
    updateTimerDisplay();

    // Generate a full valid board
    solution = generateSolvedBoard();
    // Create the puzzle by removing numbers
    board = createPuzzle(solution, difficulty);
    initialBoard = [...board];
    history = [];

    updateBoardUI();
    messageElement.classList.add("hidden");
    selectedCell = null;

    // Clear any previous highlights
    document.querySelectorAll(".cell").forEach((cell) => {
      cell.classList.remove(
        "selected",
        "highlighted",
        "error",
        "same-num",
        "correct"
      );
    });

    updateSubmitButton();
    startTimer();
  }

  function updateBoardUI() {
    const cells = document.querySelectorAll(".cell");
    cells.forEach((cell, index) => {
      const val = board[index];
      cell.textContent = val === 0 ? "" : val;

      cell.className = "cell"; // Reset classes
      if (initialBoard[index] !== 0) {
        cell.classList.add("fixed");
      }
    });
  }

  function selectCell(cell) {
    if (selectedCell) {
      selectedCell.classList.remove("selected");
    }

    selectedCell = cell;
    selectedCell.classList.add("selected");

    highlightRelatedCells(cell);
  }

  function highlightRelatedCells(cell) {
    const index = parseInt(cell.dataset.index);
    const row = Math.floor(index / 9);
    const col = index % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;

    const cells = document.querySelectorAll(".cell");
    cells.forEach((c) => {
      c.classList.remove("highlighted");
    });

    // Highlight row, col, and box
    for (let i = 0; i < 9; i++) {
      cells[row * 9 + i].classList.add("highlighted");
      cells[i * 9 + col].classList.add("highlighted");
    }

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        cells[(boxRow + r) * 9 + (boxCol + c)].classList.add("highlighted");
      }
    }
  }

  function fillCell(cell, num) {
    const index = parseInt(cell.dataset.index);

    // Don't change fixed cells
    if (initialBoard[index] !== 0) return;

    const prevVal = board[index];
    if (prevVal === num) return;

    // Add to history
    history.push({ index, prevVal, newVal: num });

    board[index] = num;
    cell.textContent = num === 0 ? "" : num;

    // Remove any feedback classes
    cell.classList.remove("error", "correct");

    highlightRelatedCells(cell);
    updateSubmitButton();
  }

  function undoMove() {
    if (history.length === 0) return;

    const lastMove = history.pop();
    const { index, prevVal } = lastMove;

    board[index] = prevVal;
    const cell = document.querySelector(`.cell[data-index="${index}"]`);
    cell.textContent = prevVal === 0 ? "" : prevVal;
    cell.classList.remove("error", "correct");

    if (selectedCell) {
      highlightRelatedCells(selectedCell);
    }

    updateSubmitButton();
  }

  function moveSelection(key) {
    if (!selectedCell) return;
    const index = parseInt(selectedCell.dataset.index);
    let newIndex = index;

    if (key === "ArrowUp") newIndex -= 9;
    if (key === "ArrowDown") newIndex += 9;
    if (key === "ArrowLeft") newIndex -= 1;
    if (key === "ArrowRight") newIndex += 1;

    if (newIndex >= 0 && newIndex < 81) {
      const cells = document.querySelectorAll(".cell");
      selectCell(cells[newIndex]);
    }
  }

  function updateSubmitButton() {
    if (!submitBtn) return;
    const allFilled = !board.includes(0);
    submitBtn.disabled = !allFilled;
  }

  async function submitGame() {
    const cells = document.querySelectorAll(".cell");

    // Clear previous feedback
    cells.forEach((cell) => {
      cell.classList.remove("error", "correct");
    });

    // 1. Run row checks in parallel
    const validationResults = await Promise.all(
      Array.from({ length: 9 }, (_, row) => CheckCompletion(row))
    );

    // 2. Apply results in parallel
    const appliedResults = await Promise.all(
      validationResults.map((result) => applyRowResult(result, cells))
    );

    // 3. Aggregate counts
    let totalCorrect = 0;
    let totalWrong = 0;

    appliedResults.forEach(({ correct, wrong }) => {
      totalCorrect += correct;
      totalWrong += wrong;
    });

    // 4. Final solved check
    const isSolved = totalWrong === 0 && !board.includes(0);

    if (isSolved) {
      stopTimer();
      showMessage(`Solved in ${formatTime(seconds)}!`, "success");
    } else {
      showMessage(
        `${totalCorrect} correct, ${totalWrong} wrong. Keep trying!`,
        "info"
      );
    }
  }

  function CheckCompletion(row) {
    return new Promise((resolve) => {
      const start = row * 9;
      const end = start + 9;

      const wrongCells = [];
      const correctCells = [];

      for (let i = start; i < end; i++) {
        // only user-filled cells
        if (initialBoard[i] === 0) {
          if (board[i] === solution[i]) {
            correctCells.push(i);
          } else {
            wrongCells.push(i);
          }
        }
      }

      resolve({ correctCells, wrongCells });
    });
  }

  async function applyRowResult({ correctCells, wrongCells }, cells) {
    let correct = 0;
    let wrong = 0;

    correctCells.forEach((index) => {
      cells[index].classList.add("correct");
      correct++;
    });

    wrongCells.forEach((index) => {
      cells[index].classList.add("error");
      wrong++;
    });

    return { correct, wrong };
  }

  function solveGame() {
    board = [...solution];
    updateBoardUI();
    stopTimer();
    showMessage("Solved!", "success");
    updateSubmitButton();
  }

  function showMessage(text, type) {
    messageElement.textContent = text;
    messageElement.classList.remove("hidden");

    setTimeout(() => {
      messageElement.classList.add("hidden");
    }, 3000);
  }

  function toggleTheme() {
    const html = document.documentElement;
    if (html.getAttribute("data-theme") === "dark") {
      html.removeAttribute("data-theme");
    } else {
      html.setAttribute("data-theme", "dark");
    }
  }

  // --- Timer Logic ---
  function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
      seconds++;
      updateTimerDisplay();
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
  }

  function updateTimerDisplay() {
    timerElement.textContent = formatTime(seconds);
  }

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  // --- Sudoku Logic ---

  function generateSolvedBoard() {
    const newBoard = new Array(81).fill(0);
    fillBoard(newBoard);
    return newBoard;
  }

  function fillBoard(board) {
    const emptyIndex = board.indexOf(0);
    if (emptyIndex === -1) return true;

    const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    for (let num of numbers) {
      if (isValidMove(board, emptyIndex, num)) {
        board[emptyIndex] = num;
        if (fillBoard(board)) return true;
        board[emptyIndex] = 0;
      }
    }
    return false;
  }

  function isValidMove(board, index, num) {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;

    // Check row
    for (let i = 0; i < 9; i++) {
      if (board[row * 9 + i] === num && row * 9 + i !== index) return false;
    }

    // Check col
    for (let i = 0; i < 9; i++) {
      if (board[i * 9 + col] === num && i * 9 + col !== index) return false;
    }

    // Check box
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const idx = (boxRow + r) * 9 + (boxCol + c);
        if (board[idx] === num && idx !== index) return false;
      }
    }

    return true;
  }

  function createPuzzle(solvedBoard, difficulty) {
    const puzzle = [...solvedBoard];
    let attempts =
      difficulty === "easy" ? 30 : difficulty === "medium" ? 45 : 60;

    while (attempts > 0) {
      let idx = Math.floor(Math.random() * 81);
      while (puzzle[idx] === 0) {
        idx = Math.floor(Math.random() * 81);
      }
      puzzle[idx] = 0;
      attempts--;
    }
    return puzzle;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
});
