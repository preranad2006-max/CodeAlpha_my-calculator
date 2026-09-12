const expressionElement = document.querySelector("#expression");
const resultElement = document.querySelector("#result");
const keypad = document.querySelector(".keypad");

let expression = "";
let justEvaluated = false;

const operators = ["+", "−", "×", "÷"];

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return "Error";
  }

  const rounded = Number.parseFloat(value.toPrecision(12));
  return rounded.toLocaleString("en-US", {
    maximumFractionDigits: 10,
    useGrouping: false,
  });
}

function getCurrentNumber() {
  const match = expression.match(/(?:^|[+−×÷])(-?(?:\d+\.?\d*|\.\d+)%?)$/);
  return match ? match[1] : "";
}

function displayExpression(value = expression) {
  expressionElement.textContent = value || "Ready when you are";
}

function displayValue(value = expression) {
  if (!value) {
    resultElement.textContent = "0";
    return;
  }

  const currentNumber = getCurrentNumber();
  if (currentNumber) {
    const numericValue = currentNumber.endsWith("%")
      ? Number.parseFloat(currentNumber) / 100
      : Number.parseFloat(currentNumber);
    resultElement.textContent = Number.isNaN(numericValue)
      ? "0"
      : formatNumber(numericValue);
  } else {
    resultElement.textContent = "0";
  }
}

function refreshDisplay() {
  displayExpression();
  displayValue();
}

function appendNumber(number) {
  if (justEvaluated) {
    expression = "";
    justEvaluated = false;
  }

  const currentNumber = getCurrentNumber();
  if (currentNumber === "0") {
    expression = expression.slice(0, -1);
  }
  expression += number;
  refreshDisplay();
}

function appendDecimal() {
  if (justEvaluated) {
    expression = "";
    justEvaluated = false;
  }

  const currentNumber = getCurrentNumber();
  if (currentNumber.includes(".")) {
    return;
  }

  if (!currentNumber || currentNumber === "-") {
    expression += "0.";
  } else {
    expression += ".";
  }
  refreshDisplay();
}

function appendOperator(operator) {
  if (!expression) {
    if (operator === "−") {
      expression = "−";
      refreshDisplay();
    }
    return;
  }

  if (expression === "−") {
    return;
  }

  justEvaluated = false;
  const lastCharacter = expression.at(-1);

  if (operators.includes(lastCharacter)) {
    if (operator === "−" && lastCharacter !== "−") {
      expression += operator;
    } else {
      expression = expression.slice(0, -1) + operator;
    }
  } else {
    expression += operator;
  }
  refreshDisplay();
}

function appendPercent() {
  if (!expression || operators.includes(expression.at(-1))) {
    return;
  }

  if (!getCurrentNumber().endsWith("%")) {
    expression += "%";
  }
  refreshDisplay();
}

function clearCalculator() {
  expression = "";
  justEvaluated = false;
  refreshDisplay();
}

function backspace() {
  if (justEvaluated) {
    clearCalculator();
    return;
  }
  expression = expression.slice(0, -1);
  refreshDisplay();
}

function tokenize(value) {
  const tokens = [];
  let number = "";

  const pushNumber = () => {
    if (number && number !== "−") {
      tokens.push({ type: "number", value: Number(number) });
      number = "";
    }
  };

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (/\d|\./.test(character)) {
      number += character;
      continue;
    }

    if (character === "%") {
      pushNumber();
      tokens.push({ type: "percent" });
      continue;
    }

    if (operators.includes(character)) {
      if (character === "−" && (!number && (tokens.length === 0 || tokens.at(-1).type === "operator"))) {
        number = "-";
      } else {
        pushNumber();
        tokens.push({ type: "operator", value: character });
      }
    }
  }
  pushNumber();
  return tokens;
}

function calculate(value) {
  const tokens = tokenize(value);
  if (!tokens.length || tokens.at(-1).type === "operator") {
    throw new Error("Incomplete expression");
  }

  const values = [];
  const pendingOperators = [];
  const precedence = { "+": 1, "−": 1, "×": 2, "÷": 2 };

  const applyOperator = () => {
    const operator = pendingOperators.pop();
    const right = values.pop();
    const left = values.pop();

    if (left === undefined || right === undefined) {
      throw new Error("Incomplete expression");
    }

    if (operator === "+") values.push(left + right);
    if (operator === "−") values.push(left - right);
    if (operator === "×") values.push(left * right);
    if (operator === "÷") {
      if (right === 0) throw new Error("Cannot divide by zero");
      values.push(left / right);
    }
  };

  for (const token of tokens) {
    if (token.type === "number") {
      values.push(token.value);
    } else if (token.type === "percent") {
      const valueToConvert = values.pop();
      if (valueToConvert === undefined) throw new Error("Invalid percent");
      values.push(valueToConvert / 100);
    } else {
      while (
        pendingOperators.length &&
        precedence[pendingOperators.at(-1)] >= precedence[token.value]
      ) {
        applyOperator();
      }
      pendingOperators.push(token.value);
    }
  }

  while (pendingOperators.length) {
    applyOperator();
  }

  if (values.length !== 1 || !Number.isFinite(values[0])) {
    throw new Error("Invalid expression");
  }
  return values[0];
}

function evaluate() {
  if (!expression || expression === "−") return;

  try {
    const value = calculate(expression);
    const formatted = formatNumber(value);
    expressionElement.textContent = `${expression} =`;
    resultElement.textContent = formatted;
    expression = formatted;
    justEvaluated = true;
  } catch {
    expressionElement.textContent = "That calculation isn't valid";
    resultElement.textContent = "Error";
    expression = "";
    justEvaluated = false;
  }
}

function handleAction(action) {
  if (action === "clear") clearCalculator();
  if (action === "backspace") backspace();
  if (action === "decimal") appendDecimal();
  if (action === "percent") appendPercent();
  if (action === "equals") evaluate();
}

keypad.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.number !== undefined) appendNumber(button.dataset.number);
  if (button.dataset.operator) appendOperator(button.dataset.operator);
  if (button.dataset.action) handleAction(button.dataset.action);
});

function pressKey(key) {
  if (/^\d$/.test(key)) appendNumber(key);
  if (key === ".") appendDecimal();
  if (["+", "-", "*", "/", "×", "÷", "−"].includes(key)) {
    const operator = { "-": "−", "*": "×", "/": "÷" }[key] || key;
    appendOperator(operator);
  }
  if (key === "%") appendPercent();
  if (key === "Enter" || key === "=") evaluate();
  if (key === "Escape") clearCalculator();
  if (key === "Backspace" || key === "Delete") backspace();
}

const calculatorKeys = new Set([
  ... "0123456789.+-*/×÷−%=".split(""),
  "Enter",
  "Escape",
  "Backspace",
  "Delete",
]);

document.addEventListener("keydown", (event) => {
  if (!calculatorKeys.has(event.key)) return;
  event.preventDefault();
  pressKey(event.key);
});

refreshDisplay();