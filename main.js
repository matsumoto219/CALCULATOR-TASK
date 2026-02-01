// 変数を設定
let currentValue = "0";          // 入力中の右辺(表示しやすいよう文字列で管理)
let previousValue = null;        // 左辺(数値)とその表示文字列
let previousDisplay = null;      // 左辺の表示用文字列(式表示のため)
let operator = null;             // 選択中の演算子
let isNewEntry = true;           // 次の数字入力でcurrentValueを作り直すフラグ用
let displayText = "0";           // ディスプレイ表示文字列(式 or 結果)

// =連打用(最後に実行した演算を覚える)
let lastOperator = null;
let lastOperand = null;


// displayTextの値をディスプレイに反映
function updateDisplay() {
  $("#display").text(displayText);
}

// 表示用の演算子記号を変換
function formatOperatorForDisplay(operator) {
  if (operator === "*") {
    return "×";
  }
  if (operator === "/") {
    return "÷";
  }

  return operator;
}

// 左辺・演算子・右辺から、ディスプレイ表示用の文字列(式 or 入力中)の値を作る
function setDisplayFromState() {
  // 演算子が無ければcurrentValueを表示
  if (operator === null || previousDisplay === null) {
    displayText = currentValue;
    return;
  }

  // 演算子がある場合は 左辺 + 演算子 + 右辺(入力中)
  // 右辺がまだ無いisNewEntry=trueの場合、左辺 + 演算子まで
  const operatorDisplay = formatOperatorForDisplay(operator);
  displayText = isNewEntry ? (previousDisplay + operatorDisplay) : (previousDisplay + operatorDisplay + currentValue);
}
  
// 数字、00、小数点の入力をcurrentValueに反映し、式表示(displayText)も更新する
function appendNumber(input) {
  // 演算子を押した直後等は、新しい入力として開始
  if (isNewEntry) {
    if (input === ".") {
      currentValue = "0.";
    } else if (input === "00") {
      currentValue = currentValue === "-" ? "-0" : "0";
    } else {
      currentValue = currentValue === "-" ? ("-" + String(input)) : String(input);    // "-"単体のときは"-"の後ろに数字が来るように
    }

    // 前回の履歴を破棄
    lastOperator = null;
    lastOperand = null;

    isNewEntry = false;
    setDisplayFromState();
    updateDisplay();
    return;
  }

  // "-"の状態で数字入力された場合
  if (currentValue === "-") {
    if (input === ".") {
      currentValue = "-0.";
    } else if (input === "0" || input === "00") {
      currentValue = "-0";
    } else {
      currentValue = "-" + String(input);
    }

    setDisplayFromState();
    updateDisplay();
    return;
  }

  // 小数点重複防止
  if (input === ".") {
    if (currentValue.includes(".")) {
      return;
    }

    currentValue += ".";
    setDisplayFromState();
    updateDisplay();
    return;
  }

  // 先頭の0制御(負数対応)
  if (currentValue === "0") {
    if (input === "0" || input === "00") {
      return;
    }

    currentValue = String(input);
    setDisplayFromState();
    updateDisplay();
    return;
  }

  // "-0"の状態から数字が来たら、"-1"のように負の数として確定させる
  if (currentValue === "-0") {
    if (input === "0" || input === "00") {
      return;
    }

    currentValue = "-" + String(input);
    setDisplayFromState();
    updateDisplay();
    return;
  }

  // 通常連結
  currentValue += String(input);
  setDisplayFromState();
  updateDisplay();
}

// リセット関数
function clearAll() {
  currentValue = "0";
  previousValue = null;
  previousDisplay = null;
  operator = null;
  lastOperator = null;
  lastOperand = null;
  isNewEntry = true;
  displayText = "0";
  updateDisplay();
}

// 計算用関数 (a:左辺、b:右辺、operator:演算子)
function calculate(a, b, operator) {
  switch (operator) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return a / b;
    default:
      return b;
  }
}

// 演算子入力関数
function setOperator(nextOperator) {
  // マイナスを最初に押したら負数入力を開始
  if (previousValue === null && operator === null && isNewEntry && nextOperator === "-") {
    currentValue = "-";
    displayText = "-";
    isNewEntry = false;
    updateDisplay();
    return;
  }

  // currentValueがマイナスのまま演算子を押した場合は無視
  if (currentValue === "-") {
    return;
  }

  // 演算子が連続で押された場合は上書き
  if (operator !== null && isNewEntry) {
    operator = nextOperator;
    setDisplayFromState();
    updateDisplay();
    return;
  }

  // 左辺を確定して演算子をセット
  if (previousValue === null) {
    previousDisplay = currentValue;
    previousValue = Number(currentValue);
    operator = nextOperator;
    isNewEntry = true;
    setDisplayFromState();
    updateDisplay();
    return;
  }

  // 連続計算(例: 1 + 2 + 3)演算子入力時に中間計算を実行
  const a = previousValue;
  const b = Number(currentValue);
  const result = calculate(a, b, operator);

  // エラー検知
  if (isCalculateError(result)) {
    setErrorState();
    return;
  }
  
  previousValue = result;     // 中間結果を次の左辺として保持
  previousDisplay = String(result);
  operator = nextOperator;
  isNewEntry = true;
  setDisplayFromState();
  updateDisplay();
}

// 計算実行関数
function runEqual() {
  // イコールが1回以上押された時の処理
  if (operator === null) {
    if (lastOperator === null || lastOperand === null) {
      return;
    }

    const a = Number(currentValue);
    const b = lastOperand;
    const result = calculate(a, b, lastOperator);

    // エラー検知
    if (isCalculateError(result)) {
      setErrorState();
      return;
    }

    // 結果を表示
    currentValue = String(result);
    displayText = currentValue;
    isNewEntry = true;
    updateDisplay();
    return;
  }

  // イコールが押された時の処理
  if (previousValue === null) {
    return;
  }

  const a = previousValue;
  const b = isNewEntry ? a : Number(currentValue);    // 演算子の直後にイコールが押された場合はaを右辺として扱う
  const result = calculate(a, b, operator);

  // エラー検知
  if (isCalculateError(result)) {
    setErrorState();
    return;
  }

  // 結果を表示
  currentValue = String(result);
  displayText = currentValue;

  // イコール連打用に最後の演算を保存
  lastOperator = operator;
  lastOperand = b;

  // 次の入力に備えて状態をリセット
  previousValue = null;
  previousDisplay = null;
  operator = null;
  isNewEntry = true;
  updateDisplay();
}

// エラー検知用関数
function isCalculateError(result) {
  // ゼロ除算や数値として成立していない場合(NaN、Infinity)
  if (!Number.isFinite(result)) {
    return true;
  }
  return false;
}

// エラー表示関数(エラー表示し、リセット)
function setErrorState() {
  currentValue = "0";
  previousValue = null;
  previousDisplay = null;
  operator = null;
  lastOperator = null;
  lastOperand = null;
  isNewEntry = true;
  displayText = "Error";
  updateDisplay();
}

// 入力イベント関数
$(function() {
  updateDisplay();
  $(".key").click(function() {
    const value = $(this).data("value");
    const action = $(this).data("action");

    // AC
    if (action === "clear") {
      clearAll();
      return;
    }

    // =
    if (action === "equal") {
      runEqual();
      return;
    }

    // 演算子
    if (value === "+" || value === "-" || value === "*" || value === "/") {
      setOperator(value);
      return;
    }

    // 数字、00、小数点
    appendNumber(String(value));
  });
});