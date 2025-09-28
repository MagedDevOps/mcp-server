# شرح MCP Server والأداة البسيطة

## ما هو MCP Server؟

**MCP (Model Context Protocol)** هو بروتوكول يسمح للذكاء الاصطناعي بالتفاعل مع أدوات خارجية. ببساطة، هو طريقة تجعل الذكاء الاصطناعي يستطيع استخدام وظائف محددة.

## مثال بسيط: أداة جمع رقمين

```javascript
server.registerTool(
  "add_numbers",
  {
    description: "Add two numbers together",
    inputSchema: {
      firstNumber: z.number().describe("First number to add"),
      secondNumber: z.number().describe("Second number to add"),
    },
  },
  async ({ firstNumber, secondNumber }) => {
    const result = firstNumber + secondNumber;
    return {
      content: [{ 
        type: "text", 
        text: `The sum of ${firstNumber} + ${secondNumber} = ${result}` 
      }],
    };
  }
);
```

## شرح كل جزء:

### 1. اسم الأداة
```javascript
"add_numbers"
```
- **الغرض**: اسم فريد للأداة
- **مثال**: عندما يريد الذكاء الاصطناعي جمع رقمين، سيستخدم هذا الاسم

### 2. وصف الأداة
```javascript
{
  description: "Add two numbers together"
}
```
- **الغرض**: يشرح للذكاء الاصطناعي ما تفعله الأداة
- **مثال**: "هذه الأداة تجمع رقمين معاً"

### 3. مخطط البيانات المدخلة
```javascript
inputSchema: {
  firstNumber: z.number().describe("First number to add"),
  secondNumber: z.number().describe("Second number to add"),
}
```
- **`z.number()`**: يحدد أن المعامل يجب أن يكون رقم
- **`describe()`**: يشرح للمستخدم ما هو هذا المعامل
- **النتيجة**: الأداة تتوقع رقمين كمدخل

### 4. دالة التنفيذ
```javascript
async ({ firstNumber, secondNumber }) => {
  const result = firstNumber + secondNumber;
  return {
    content: [{ 
      type: "text", 
      text: `The sum of ${firstNumber} + ${secondNumber} = ${result}` 
    }],
  };
}
```

#### تفصيل الدالة:
- **`async`**: الدالة تعمل بشكل غير متزامن
- **`({ firstNumber, secondNumber })`**: استقبال المعاملات
- **`const result = firstNumber + secondNumber`**: إجراء العملية الحسابية
- **`return { content: [...] }`**: إرجاع النتيجة بصيغة محددة

## كيف تعمل الأداة؟

### 1. المستخدم يطلب:
"جمع 5 و 3"

### 2. الذكاء الاصطناعي يستدعي الأداة:
```javascript
{
  "tool": "add_numbers",
  "parameters": {
    "firstNumber": 5,
    "secondNumber": 3
  }
}
```

### 3. الأداة تعيد النتيجة:
```
The sum of 5 + 3 = 8
```

## المميزات:

✅ **بساطة**: كود واضح ومفهوم  
✅ **مرونة**: يمكن تعديلها بسهولة  
✅ **أمان**: التحقق من نوع البيانات  
✅ **وضوح**: كل جزء له غرض محدد  

## كيفية إضافة الأداة للخادم:

1. **افتح ملف `server.js`**
2. **أضف الكود** بعد إنشاء المخدم
3. **أعد تشغيل الخادم**
4. **اختبر الأداة** عبر الذكاء الاصطناعي

هذا كل شيء! أداة بسيطة تجمع رقمين وتعيد النتيجة.
