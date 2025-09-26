import { Attempt, SessionUser } from "../types";
import { deserializeToPrisma } from "./serde";

const attempt = {
  id: {
    $oid: "6759a6099c0bdfd049927783",
  },
  prerequisites: [],
  deprecated: false,
  questionSets: [
    {
      id: {
        $oid: "674d8605274fd1320e98525c",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d8605274fd1320e98525d",
          },
          text: "Which of the following examples shows the correct syntax for creating an array?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d8685274fd1320e98525e",
              },
              isCorrect: false,
              text: "`const arr = array<1, 2, 3>;`",
            },
            {
              id: {
                $oid: "674d868e274fd1320e98525f",
              },
              isCorrect: false,
              text: '`const arr = "1, 2, 3";`',
            },
            {
              id: {
                $oid: "674d8694274fd1320e985260",
              },
              isCorrect: false,
              text: "const arr = {1, 2, 3};`",
            },
            {
              id: {
                $oid: "674d86a6274fd1320e985261",
              },
              isCorrect: true,
              text: "`const arr = [1, 2, 3];`",
            },
          ],
          selected: [
            {
              $oid: "674d86a6274fd1320e985261",
            },
          ],
          submissionTimeInMS: 1756827518905,
        },
      ],
    },
    {
      id: {
        $oid: "674d86c2274fd1320e985262",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d86c2274fd1320e985263",
          },
          text: "Which string method returns the index of the first occurrence of a substring within a string?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d86cf274fd1320e985264",
              },
              isCorrect: false,
              text: "`match()`",
            },
            {
              id: {
                $oid: "674d86d5274fd1320e985265",
              },
              isCorrect: false,
              text: "`valueOf()`",
            },
            {
              id: {
                $oid: "674d86e3274fd1320e985266",
              },
              isCorrect: true,
              text: "`indexOf()`",
            },
            {
              id: {
                $oid: "674d86ec274fd1320e985267",
              },
              isCorrect: false,
              text: "`index()`",
            },
          ],
          selected: [
            {
              $oid: "674d86e3274fd1320e985266",
            },
          ],
          submissionTimeInMS: 1756827565913,
        },
      ],
    },
    {
      id: {
        $oid: "674d871b274fd1320e985268",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d871b274fd1320e985269",
          },
          text: "What does the `concat()` method do?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d874a274fd1320e98526a",
              },
              isCorrect: false,
              text: "Joins the elements and converts them into a string.",
            },
            {
              id: {
                $oid: "674d8750274fd1320e98526b",
              },
              isCorrect: true,
              text: "Merges two arrays into a new array.",
            },
            {
              id: {
                $oid: "674d8757274fd1320e98526c",
              },
              isCorrect: false,
              text: "Adds an element to the beginning of the array.",
            },
            {
              id: {
                $oid: "674d8761274fd1320e98526d",
              },
              isCorrect: false,
              text: "Removes an element from the array.",
            },
          ],
          selected: [
            {
              $oid: "674d874a274fd1320e98526a",
            },
          ],
          submissionTimeInMS: 1756827575001,
        },
      ],
    },
    {
      id: {
        $oid: "674d8837274fd1320e98526e",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d8837274fd1320e98526f",
          },
          text: "Which of the following is the correct way to use template literals?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d8847274fd1320e985270",
              },
              isCorrect: true,
              text: "```js\nconst greeting = `Hello, ${name}!`;\n```",
            },
            {
              id: {
                $oid: "674d884f274fd1320e985271",
              },
              isCorrect: false,
              text: "```js\nconst greeting = <Hello, ${name}!>;\n```",
            },
            {
              id: {
                $oid: "674d885b274fd1320e985272",
              },
              isCorrect: false,
              text: "```js\nconst greeting = 'Hello, ${name}!';\n```",
            },
            {
              id: {
                $oid: "674d8861274fd1320e985273",
              },
              isCorrect: false,
              text: "```js\nconst greeting = (Hello, ${name}!);\n```",
            },
          ],
          selected: [
            {
              $oid: "674d8847274fd1320e985270",
            },
          ],
          submissionTimeInMS: 1756827696843,
        },
      ],
    },
    {
      id: {
        $oid: "674d8875274fd1320e985274",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d8875274fd1320e985275",
          },
          text: "Which method will return a new array without changing the original array?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d89b5274fd1320e985276",
              },
              isCorrect: false,
              text: "`splice()`",
            },
            {
              id: {
                $oid: "674d89c8274fd1320e985277",
              },
              isCorrect: false,
              text: "`pop()`",
            },
            {
              id: {
                $oid: "674d89d0274fd1320e985278",
              },
              isCorrect: false,
              text: "`push()`",
            },
            {
              id: {
                $oid: "674d89d7274fd1320e985279",
              },
              isCorrect: true,
              text: "`slice()`",
            },
          ],
          selected: [
            {
              $oid: "674d89d7274fd1320e985279",
            },
          ],
          submissionTimeInMS: 1756827696843,
        },
      ],
    },
    {
      id: {
        $oid: "674d89e5274fd1320e98527a",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d89e5274fd1320e98527b",
          },
          text: "What is the purpose of classes in JavaScript?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d89f3274fd1320e98527c",
              },
              isCorrect: false,
              text: "Classes are used to convert strings into arrays.",
            },
            {
              id: {
                $oid: "674d89f8274fd1320e98527d",
              },
              isCorrect: true,
              text: "Classes are used to define blueprints for creating objects and encapsulating related data and behavior.",
            },
            {
              id: {
                $oid: "674d89fd274fd1320e98527e",
              },
              isCorrect: false,
              text: "Classes are used to create global variables.",
            },
            {
              id: {
                $oid: "674d8a3f274fd1320e98527f",
              },
              isCorrect: false,
              text: "Classes are used to transform a function with multiple arguments into a series of functions, each taking a single argument.",
            },
          ],
          selected: [
            {
              $oid: "674d89fd274fd1320e98527e",
            },
          ],
          submissionTimeInMS: 1756827703198,
        },
      ],
    },
    {
      id: {
        $oid: "674d8a56274fd1320e985280",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d8a56274fd1320e985281",
          },
          text: "Which of the following is the correct syntax for a class?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d8a61274fd1320e985282",
              },
              isCorrect: true,
              text: "```js\nclass Vehicle {\n  constructor(brand, year) {\n    this.brand = brand;\n    this.year = year;\n  }\n}\n```\n",
            },
            {
              id: {
                $oid: "674d8a76274fd1320e985283",
              },
              isCorrect: false,
              text: "```js\nclasses Vehicle {\n  constructor(brand, year) {\n    this.brand = brand;\n    this.year = year;\n  }\n}\n```\n",
            },
            {
              id: {
                $oid: "674d8a81274fd1320e985284",
              },
              isCorrect: false,
              text: "```js\nconstructor Vehicle {\n  class(brand, year) {\n    this.brand = brand;\n    this.year = year;\n  }\n}\n```\n",
            },
            {
              id: {
                $oid: "674d8a90274fd1320e985285",
              },
              isCorrect: false,
              text: "```js\nconst Vehicle {\n  class(brand, year) {\n    this.brand = brand;\n    this.year = year;\n  }\n}\n```\n",
            },
          ],
          selected: [
            {
              $oid: "674d8a76274fd1320e985283",
            },
          ],
          submissionTimeInMS: 1756827706112,
        },
      ],
    },
    {
      id: {
        $oid: "674d8ace274fd1320e985286",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d8ace274fd1320e985287",
          },
          text: "Which of the following methods is used to get the first element in an HTML document that matches the CSS selector passed as an argument?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d8adc274fd1320e985288",
              },
              isCorrect: true,
              text: "`querySelector()`",
            },
            {
              id: {
                $oid: "674d8aea274fd1320e985289",
              },
              isCorrect: false,
              text: "`query()`",
            },
            {
              id: {
                $oid: "674d8af9274fd1320e98528a",
              },
              isCorrect: false,
              text: "`selectorQuery()`",
            },
            {
              id: {
                $oid: "674d8b02274fd1320e98528b",
              },
              isCorrect: false,
              text: "`selectQuery()`",
            },
          ],
          selected: [
            {
              $oid: "674d8b02274fd1320e98528b",
            },
          ],
          submissionTimeInMS: 1756827709307,
        },
      ],
    },
    {
      id: {
        $oid: "674d8b3e274fd1320e98528c",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d8b3e274fd1320e98528d",
          },
          text: "What is the difference between `==` and `===`?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d8b4d274fd1320e98528e",
              },
              isCorrect: false,
              text: "There is no difference - both operators perform the exact same comparison.",
            },
            {
              id: {
                $oid: "674d8b53274fd1320e98528f",
              },
              isCorrect: false,
              text: "`==` compares both value and data type, while `===` only compares value.",
            },
            {
              id: {
                $oid: "674d8b65274fd1320e985290",
              },
              isCorrect: false,
              text: "Both operators check the data type of the value, but only `===` performs a deep comparison.",
            },
            {
              id: {
                $oid: "674d8b7e274fd1320e985291",
              },
              isCorrect: true,
              text: "`===` compares both value and type without type coercion, while `==` performs type coercion to compare values of different types.",
            },
          ],
          selected: [
            {
              $oid: "674d8b65274fd1320e985290",
            },
          ],
          submissionTimeInMS: 1756827696843,
        },
      ],
    },
    {
      id: {
        $oid: "674d8bb8274fd1320e985292",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d8bb8274fd1320e985293",
          },
          text: "Which of the following is NOT a comparison operator?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d8bbf274fd1320e985294",
              },
              isCorrect: false,
              text: "`===`",
            },
            {
              id: {
                $oid: "674d8bc6274fd1320e985295",
              },
              isCorrect: false,
              text: "`!==`",
            },
            {
              id: {
                $oid: "674d8bce274fd1320e985296",
              },
              isCorrect: false,
              text: "`>`",
            },
            {
              id: {
                $oid: "674d8bd4274fd1320e985297",
              },
              isCorrect: true,
              text: "`::=`",
            },
          ],
          selected: [
            {
              $oid: "674d8bd4274fd1320e985297",
            },
          ],
          submissionTimeInMS: 1756827696843,
        },
      ],
    },
    {
      id: {
        $oid: "674d8be8274fd1320e985298",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d8be8274fd1320e985299",
          },
          text: "Which logical operator is denoted by `||`?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d8bf4274fd1320e98529a",
              },
              isCorrect: true,
              text: "OR",
            },
            {
              id: {
                $oid: "674d8bf8274fd1320e98529b",
              },
              isCorrect: false,
              text: "AND",
            },
            {
              id: {
                $oid: "674d8bfb274fd1320e98529c",
              },
              isCorrect: false,
              text: "NOT",
            },
            {
              id: {
                $oid: "674d8bfe274fd1320e98529d",
              },
              isCorrect: false,
              text: "XOR",
            },
          ],
          selected: [
            {
              $oid: "674d8bf4274fd1320e98529a",
            },
          ],
          submissionTimeInMS: 1756827723688,
        },
      ],
    },
    {
      id: {
        $oid: "674d8c05274fd1320e98529e",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d8c05274fd1320e98529f",
          },
          text: "What happens when you don't include a `break` statement while implementing a `switch` statement?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d8c10274fd1320e9852a0",
              },
              isCorrect: false,
              text: "The `switch` statement will stop abruptly.",
            },
            {
              id: {
                $oid: "674d8c12274fd1320e9852a1",
              },
              isCorrect: true,
              text: "The code continues to evaluate the following statements, even after finding a match.",
            },
            {
              id: {
                $oid: "674d8c1a274fd1320e9852a2",
              },
              isCorrect: false,
              text: "The `switch` statement will throw an error.",
            },
            {
              id: {
                $oid: "674d8c22274fd1320e9852a3",
              },
              isCorrect: false,
              text: "The `switch` statement will exit after the first match.",
            },
          ],
          selected: [
            {
              $oid: "674d8c12274fd1320e9852a1",
            },
          ],
          submissionTimeInMS: 1756827725692,
        },
      ],
    },
    {
      id: {
        $oid: "674d8c2a274fd1320e9852a4",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d8c2a274fd1320e9852a5",
          },
          text: "What keyword is used in a `switch` statement to handle cases when all of the specified cases are false?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d8c33274fd1320e9852a6",
              },
              isCorrect: false,
              text: "`then`",
            },
            {
              id: {
                $oid: "674d8c37274fd1320e9852a7",
              },
              isCorrect: true,
              text: "`default`",
            },
            {
              id: {
                $oid: "674d8c3b274fd1320e9852a8",
              },
              isCorrect: false,
              text: "`else`",
            },
            {
              id: {
                $oid: "674d8c4b274fd1320e9852a9",
              },
              isCorrect: false,
              text: "`after`",
            },
          ],
          selected: [
            {
              $oid: "674d8c4b274fd1320e9852a9",
            },
          ],
          submissionTimeInMS: 1756827727814,
        },
      ],
    },
    {
      id: {
        $oid: "674d8c58274fd1320e9852aa",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d8c58274fd1320e9852ab",
          },
          text: "Which of the following examples creates a new `Date` object instance?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d8c5f274fd1320e9852ac",
              },
              isCorrect: false,
              text: "`Date.new()`",
            },
            {
              id: {
                $oid: "674d8c68274fd1320e9852ad",
              },
              isCorrect: false,
              text: "`Date.fetch()`",
            },
            {
              id: {
                $oid: "674d8c70274fd1320e9852ae",
              },
              isCorrect: false,
              text: "`new.Date()`",
            },
            {
              id: {
                $oid: "674d8c79274fd1320e9852af",
              },
              isCorrect: true,
              text: "`new Date()`",
            },
          ],
          selected: [
            {
              $oid: "674d8c79274fd1320e9852af",
            },
          ],
          submissionTimeInMS: 1756827730333,
        },
      ],
    },
    {
      id: {
        $oid: "674d8c94274fd1320e9852b0",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d8c94274fd1320e9852b1",
          },
          text: "Which method is used to listen to events in JavaScript?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d8cab274fd1320e9852b2",
              },
              isCorrect: false,
              text: "`.eventObj()`",
            },
            {
              id: {
                $oid: "674d8cb1274fd1320e9852b3",
              },
              isCorrect: false,
              text: "`.events()`",
            },
            {
              id: {
                $oid: "674d8cb6274fd1320e9852b4",
              },
              isCorrect: true,
              text: "`.addEventListener()`",
            },
            {
              id: {
                $oid: "674d8cbd274fd1320e9852b5",
              },
              isCorrect: false,
              text: "`.getEvent()`",
            },
          ],
          selected: [
            {
              $oid: "674d8cbd274fd1320e9852b5",
            },
          ],
          submissionTimeInMS: 1756827732547,
        },
      ],
    },
    {
      id: {
        $oid: "674d9216274fd1320e9852b6",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9216274fd1320e9852b7",
          },
          text: "What is the term for a function that runs in response to an event?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d922b274fd1320e9852b8",
              },
              isCorrect: false,
              text: "Promise function.",
            },
            {
              id: {
                $oid: "674d9230274fd1320e9852b9",
              },
              isCorrect: false,
              text: "Asynchronous function.",
            },
            {
              id: {
                $oid: "674d9238274fd1320e9852ba",
              },
              isCorrect: true,
              text: "Callback function.",
            },
            {
              id: {
                $oid: "674d923f274fd1320e9852bb",
              },
              isCorrect: false,
              text: "Middleware function.",
            },
          ],
          selected: [
            {
              $oid: "674d922b274fd1320e9852b8",
            },
          ],
          submissionTimeInMS: 1756827735140,
        },
      ],
    },
    {
      id: {
        $oid: "674d9243274fd1320e9852bc",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9243274fd1320e9852bd",
          },
          text: "What is the `debugger` statement used for?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d924c274fd1320e9852be",
              },
              isCorrect: true,
              text: "This statement lets you pause your code at a specific line to investigate what's going on in the program.",
            },
            {
              id: {
                $oid: "674d9252274fd1320e9852bf",
              },
              isCorrect: false,
              text: "This statement lets you remove events from your programs.",
            },
            {
              id: {
                $oid: "674d925a274fd1320e9852c0",
              },
              isCorrect: false,
              text: "This statement lets you alter HTML and CSS code from your JavaScript file.",
            },
            {
              id: {
                $oid: "674d9265274fd1320e9852c1",
              },
              isCorrect: false,
              text: "This statement lets you temporarily pause all async functions in a JavaScript file.",
            },
          ],
          selected: [
            {
              $oid: "674d9265274fd1320e9852c1",
            },
          ],
          submissionTimeInMS: 1756827737372,
        },
      ],
    },
    {
      id: {
        $oid: "674d928b274fd1320e9852c2",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d928b274fd1320e9852c3",
          },
          text: "Which of the following events is fired when everything in the HTML document has been loaded and parsed?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9298274fd1320e9852c4",
              },
              isCorrect: false,
              text: "`DOMContentLoading`",
            },
            {
              id: {
                $oid: "674d929a274fd1320e9852c5",
              },
              isCorrect: false,
              text: "`DOMLoadedContent`",
            },
            {
              id: {
                $oid: "674d929e274fd1320e9852c6",
              },
              isCorrect: false,
              text: "`DOMLoaded`",
            },
            {
              id: {
                $oid: "674d92a8274fd1320e9852c7",
              },
              isCorrect: true,
              text: "`DOMContentLoaded`",
            },
          ],
          selected: [
            {
              $oid: "674d92a8274fd1320e9852c7",
            },
          ],
          submissionTimeInMS: 1756827739703,
        },
      ],
    },
    {
      id: {
        $oid: "674d92b9274fd1320e9852c8",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d92b9274fd1320e9852c9",
          },
          text: "What is a side effect in functional programming?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d92c7274fd1320e9852ca",
              },
              isCorrect: false,
              text: "An unexpected error that occurs during program execution.",
            },
            {
              id: {
                $oid: "674d92d0274fd1320e9852cb",
              },
              isCorrect: false,
              text: "A function that performs operations slower than expected.",
            },
            {
              id: {
                $oid: "674d92db274fd1320e9852cc",
              },
              isCorrect: false,
              text: "A recursive function that calls itself repeatedly.",
            },
            {
              id: {
                $oid: "674d92e5274fd1320e9852cd",
              },
              isCorrect: true,
              text: "A change in the program's state or an interaction with the outside world.",
            },
          ],
          selected: [
            {
              $oid: "674d92e5274fd1320e9852cd",
            },
          ],
          submissionTimeInMS: 1756827742012,
        },
      ],
    },
    {
      id: {
        $oid: "674d9317274fd1320e9852ce",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9317274fd1320e9852cf",
          },
          text: "What is a higher order function?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d931f274fd1320e9852d0",
              },
              isCorrect: false,
              text: "A function that takes longer to execute.",
            },
            {
              id: {
                $oid: "674d9324274fd1320e9852d1",
              },
              isCorrect: false,
              text: "A function with more than three arguments.",
            },
            {
              id: {
                $oid: "674d9329274fd1320e9852d2",
              },
              isCorrect: false,
              text: "A function that only returns strings and arrays.",
            },
            {
              id: {
                $oid: "674d932d274fd1320e9852d3",
              },
              isCorrect: true,
              text: "A function that takes one or more functions as arguments, or returns another function.",
            },
          ],
          selected: [
            {
              $oid: "674d931f274fd1320e9852d0",
            },
          ],
          submissionTimeInMS: 1756827744226,
        },
      ],
    },
    {
      id: {
        $oid: "674d9363274fd1320e9852d4",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9363274fd1320e9852d5",
          },
          text: "Which of the following is the correct way to declare a function?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d936b274fd1320e9852d6",
              },
              isCorrect: false,
              text: "`init myFunction = function() {};`",
            },
            {
              id: {
                $oid: "674d936f274fd1320e9852d7",
              },
              isCorrect: false,
              text: "`myFunction: function() {}`",
            },
            {
              id: {
                $oid: "674d938b274fd1320e9852d8",
              },
              isCorrect: false,
              text: "`set function = myFunction();`",
            },
            {
              id: {
                $oid: "674d9392274fd1320e9852d9",
              },
              isCorrect: true,
              text: "`function myFunction() {}`",
            },
          ],
          selected: [
            {
              $oid: "674d936f274fd1320e9852d7",
            },
          ],
          submissionTimeInMS: 1756827746550,
        },
      ],
    },
    {
      id: {
        $oid: "674d93d9274fd1320e9852da",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d93d9274fd1320e9852db",
          },
          text: "Which of the following methods is used to retrieve the `value` of a given `key` from `localStorage`?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d93df274fd1320e9852dc",
              },
              isCorrect: false,
              text: "`localStorage.setItem()`",
            },
            {
              id: {
                $oid: "674d93e5274fd1320e9852dd",
              },
              isCorrect: true,
              text: "`localStorage.getItem()`",
            },
            {
              id: {
                $oid: "674d93ea274fd1320e9852de",
              },
              isCorrect: false,
              text: "`localStorage.retrieveItem()`",
            },
            {
              id: {
                $oid: "674d93ef274fd1320e9852df",
              },
              isCorrect: false,
              text: "`localStorage.acquireItem()`",
            },
          ],
          selected: [
            {
              $oid: "674d93e5274fd1320e9852dd",
            },
          ],
          submissionTimeInMS: 1756827749050,
        },
      ],
    },
    {
      id: {
        $oid: "674d9456274fd1320e9852e0",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9456274fd1320e9852e1",
          },
          text: "What is the difference between function arguments and parameters?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d945b274fd1320e9852e2",
              },
              isCorrect: false,
              text: "Arguments and parameters both refer to the same thing and can be used interchangeably without any difference.",
            },
            {
              id: {
                $oid: "674d9462274fd1320e9852e3",
              },
              isCorrect: false,
              text: "Parameters are the actual values passed to the function, while arguments are the names of variables used in the function definition.",
            },
            {
              id: {
                $oid: "674d9470274fd1320e9852e4",
              },
              isCorrect: true,
              text: "Parameters are the variable names defined in a function's declaration, while arguments are the actual values passed to the function when it is called.",
            },
            {
              id: {
                $oid: "674d947e274fd1320e9852e5",
              },
              isCorrect: false,
              text: "Parameters are used only outside the function, while arguments are used only inside the function.",
            },
          ],
          selected: [
            {
              $oid: "674d9470274fd1320e9852e4",
            },
          ],
          submissionTimeInMS: 1756827751211,
        },
      ],
    },
    {
      id: {
        $oid: "674d94b5274fd1320e9852e6",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d94b5274fd1320e9852e7",
          },
          text: "Which of the following is the correct way to create a regular expression?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d94e2274fd1320e9852e8",
              },
              isCorrect: false,
              text: '```js\nconst regex = "freeCodeCamp";\n```',
            },
            {
              id: {
                $oid: "674d94e8274fd1320e9852e9",
              },
              isCorrect: false,
              text: "```js\nconst regex = <freeCodeCamp>;\n```",
            },
            {
              id: {
                $oid: "674d94eb274fd1320e9852ea",
              },
              isCorrect: false,
              text: "```js\nconst regex = \\freeCodeCamp\\;\n```",
            },
            {
              id: {
                $oid: "674d94f1274fd1320e9852eb",
              },
              isCorrect: true,
              text: "```js\nconst regex = /freeCodeCamp/;\n```",
            },
          ],
          selected: [
            {
              $oid: "674d94f1274fd1320e9852eb",
            },
          ],
          submissionTimeInMS: 1756827753733,
        },
      ],
    },
    {
      id: {
        $oid: "674d950c274fd1320e9852ec",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d950c274fd1320e9852ed",
          },
          text: "Which of the following methods will return a boolean if the string matches the regex?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d951c274fd1320e9852ee",
              },
              isCorrect: true,
              text: "`test()`",
            },
            {
              id: {
                $oid: "674d951e274fd1320e9852ef",
              },
              isCorrect: false,
              text: "`match()`",
            },
            {
              id: {
                $oid: "674d9523274fd1320e9852f0",
              },
              isCorrect: false,
              text: "`includes()`",
            },
            {
              id: {
                $oid: "674d952c274fd1320e9852f1",
              },
              isCorrect: false,
              text: "`with()`",
            },
          ],
          selected: [
            {
              $oid: "674d9523274fd1320e9852f0",
            },
          ],
          submissionTimeInMS: 1756827757199,
        },
      ],
    },
    {
      id: {
        $oid: "674d9540274fd1320e9852f2",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9540274fd1320e9852f3",
          },
          text: "What does CRUD stand for?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9549274fd1320e9852f4",
              },
              isCorrect: false,
              text: "Concat, Read, Update, Delete",
            },
            {
              id: {
                $oid: "674d954e274fd1320e9852f5",
              },
              isCorrect: false,
              text: "Create, Read, Update, Destructure",
            },
            {
              id: {
                $oid: "674d9554274fd1320e9852f6",
              },
              isCorrect: true,
              text: "Create, Read, Update, Delete",
            },
            {
              id: {
                $oid: "674d955a274fd1320e9852f7",
              },
              isCorrect: false,
              text: "Create, Remove, Update, Delete",
            },
          ],
          selected: [
            {
              $oid: "674d954e274fd1320e9852f5",
            },
          ],
          submissionTimeInMS: 1756827759633,
        },
      ],
    },
    {
      id: {
        $oid: "674d9617274fd1320e9852f8",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9617274fd1320e9852f9",
          },
          text: " What does destructuring allow you to do in JavaScript?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9628274fd1320e9852fa",
              },
              isCorrect: false,
              text: "Merge arrays or objects.",
            },
            {
              id: {
                $oid: "674d962d274fd1320e9852fb",
              },
              isCorrect: true,
              text: "Extract properties from objects and elements from arrays.",
            },
            {
              id: {
                $oid: "674d9635274fd1320e9852fc",
              },
              isCorrect: false,
              text: "Remove all keys from objects.",
            },
            {
              id: {
                $oid: "674d963a274fd1320e9852fd",
              },
              isCorrect: false,
              text: "Serialize objects.",
            },
          ],
          selected: [
            {
              $oid: "674d9628274fd1320e9852fa",
            },
          ],
          submissionTimeInMS: 1756827762422,
        },
      ],
    },
    {
      id: {
        $oid: "674d9647274fd1320e9852fe",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9647274fd1320e9852ff",
          },
          text: "Which of the following methods divides a string into an array of substrings and specifies where each division should happen based on a given separator?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9653274fd1320e985300",
              },
              isCorrect: true,
              text: "`split()`",
            },
            {
              id: {
                $oid: "674d9663274fd1320e985301",
              },
              isCorrect: false,
              text: "`splice()`",
            },
            {
              id: {
                $oid: "674d9665274fd1320e985302",
              },
              isCorrect: false,
              text: "`separate()`",
            },
            {
              id: {
                $oid: "674d966a274fd1320e985303",
              },
              isCorrect: false,
              text: "`slice()`",
            },
          ],
          selected: [
            {
              $oid: "674d9663274fd1320e985301",
            },
          ],
          submissionTimeInMS: 1756827764709,
        },
      ],
    },
    {
      id: {
        $oid: "674d9673274fd1320e985304",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9673274fd1320e985305",
          },
          text: "Which of the following is the correct way to remove a property from an object?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9680274fd1320e985306",
              },
              isCorrect: false,
              text: '```js\nconst person = {\n  name: "Alice",\n  age: 30,\n  job: "Engineer"\n};\n\nremove person.job;\n```',
            },
            {
              id: {
                $oid: "674d9683274fd1320e985307",
              },
              isCorrect: false,
              text: '```js\nconst person = {\n  name: "Alice",\n  age: 30,\n  job: "Engineer"\n};\n\ndel person.job;\n```',
            },
            {
              id: {
                $oid: "674d969c274fd1320e985308",
              },
              isCorrect: true,
              text: '```js\nconst person = {\n  name: "Alice",\n  age: 30,\n  job: "Engineer"\n};\n\ndelete person.job;\n```',
            },
            {
              id: {
                $oid: "674d96b5274fd1320e985309",
              },
              isCorrect: false,
              text: '```js\nconst person = {\n  name: "Alice",\n  age: 30,\n  job: "Engineer"\n};\n\nerase person.job;\n```',
            },
          ],
          selected: [
            {
              $oid: "674d9683274fd1320e985307",
            },
          ],
          submissionTimeInMS: 1756827767985,
        },
      ],
    },
    {
      id: {
        $oid: "674d973c274fd1320e98530a",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d973c274fd1320e98530b",
          },
          text: "Which of the following should be used to loop over the values of an iterable object?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d974a274fd1320e98530c",
              },
              isCorrect: false,
              text: "A `for…to` loop.",
            },
            {
              id: {
                $oid: "674d9757274fd1320e98530d",
              },
              isCorrect: false,
              text: "A `for…out` loop.",
            },
            {
              id: {
                $oid: "674d9767274fd1320e98530e",
              },
              isCorrect: false,
              text: "A `for…now` loop.",
            },
            {
              id: {
                $oid: "674d9773274fd1320e98530f",
              },
              isCorrect: true,
              text: "A `for…of` loop.",
            },
          ],
          selected: [
            {
              $oid: "674d9773274fd1320e98530f",
            },
          ],
          submissionTimeInMS: 1756827771038,
        },
      ],
    },
    {
      id: {
        $oid: "674d97b0274fd1320e985310",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d97b0274fd1320e985311",
          },
          text: "Which of the following methods is used to remove the first element from an array and return that removed element?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d97c2274fd1320e985312",
              },
              isCorrect: false,
              text: "`splice()`",
            },
            {
              id: {
                $oid: "674d97ca274fd1320e985313",
              },
              isCorrect: false,
              text: "`unshift()`",
            },
            {
              id: {
                $oid: "674d97d1274fd1320e985314",
              },
              isCorrect: false,
              text: "`push()`",
            },
            {
              id: {
                $oid: "674d97e5274fd1320e985315",
              },
              isCorrect: true,
              text: "`shift()`",
            },
          ],
          selected: [
            {
              $oid: "674d97e5274fd1320e985315",
            },
          ],
          submissionTimeInMS: 1756827773387,
        },
      ],
    },
    {
      id: {
        $oid: "674d9867274fd1320e985316",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9867274fd1320e985317",
          },
          text: "Which of the following statements can be used to break out of a loop completely?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9876274fd1320e985318",
              },
              isCorrect: true,
              text: "The `break` statement.",
            },
            {
              id: {
                $oid: "674d987b274fd1320e985319",
              },
              isCorrect: false,
              text: "The `end` statement.",
            },
            {
              id: {
                $oid: "674d9887274fd1320e98531a",
              },
              isCorrect: false,
              text: "The `label` statement.",
            },
            {
              id: {
                $oid: "674d989b274fd1320e98531b",
              },
              isCorrect: false,
              text: "The `continue` statement.",
            },
          ],
          selected: [
            {
              $oid: "674d9887274fd1320e98531a",
            },
          ],
          submissionTimeInMS: 1756827775874,
        },
      ],
    },
    {
      id: {
        $oid: "674d98bc274fd1320e98531c",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d98bc274fd1320e98531d",
          },
          text: "Which statement can be used to skip the current iteration and move to the next iteration?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d98e3274fd1320e98531e",
              },
              isCorrect: false,
              text: "The `break` statement.",
            },
            {
              id: {
                $oid: "674d98f0274fd1320e98531f",
              },
              isCorrect: false,
              text: "The `skip` statement.",
            },
            {
              id: {
                $oid: "674d98ff274fd1320e985320",
              },
              isCorrect: false,
              text: "The `label` statement.",
            },
            {
              id: {
                $oid: "674d990e274fd1320e985321",
              },
              isCorrect: true,
              text: "The `continue` statement.",
            },
          ],
          selected: [
            {
              $oid: "674d98ff274fd1320e985320",
            },
          ],
          submissionTimeInMS: 1756827778265,
        },
      ],
    },
    {
      id: {
        $oid: "674d9933274fd1320e985322",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9933274fd1320e985323",
          },
          text: "Which of the following is the correct way to delay an action for a specified time?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9942274fd1320e985324",
              },
              isCorrect: false,
              text: "```js\nsetDelay(() => {\n console.log('This runs after 3 seconds'); \n}, 3000);\n```",
            },
            {
              id: {
                $oid: "674d9944274fd1320e985325",
              },
              isCorrect: false,
              text: "```js\nsetInterval(() => {\n console.log('This runs after 3 seconds'); \n}, 3000);\n```",
            },
            {
              id: {
                $oid: "674d994a274fd1320e985326",
              },
              isCorrect: true,
              text: "```js\nsetTimeout(() => {\n console.log('This runs after 3 seconds'); \n}, 3000);\n```",
            },
            {
              id: {
                $oid: "674d9950274fd1320e985327",
              },
              isCorrect: false,
              text: "```js\nsetWait(() => {\n console.log('This runs after 3 seconds'); \n}, 3000);\n```",
            },
          ],
          selected: [
            {
              $oid: "674d9944274fd1320e985325",
            },
          ],
          submissionTimeInMS: 1756827781168,
        },
      ],
    },
    {
      id: {
        $oid: "674d9981274fd1320e985328",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9981274fd1320e985329",
          },
          text: "What is event delegation?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d99b4274fd1320e98532c",
              },
              isCorrect: true,
              text: "Event delegation is the process of listening to events that have bubbled up to a parent, rather than handling them directly on the element that triggered them.",
            },
            {
              id: {
                $oid: "674d99c2274fd1320e98532d",
              },
              isCorrect: false,
              text: "Event delegation is the process of removing to events that have bubbled down to a parent, rather than handling them directly on the element that triggered them.",
            },
            {
              id: {
                $oid: "674d99cc274fd1320e98532e",
              },
              isCorrect: false,
              text: "Event delegation is the process of listening to events that have been removed from a parent, rather than handling them directly on the element that triggered them.",
            },
            {
              id: {
                $oid: "674d99d2274fd1320e98532f",
              },
              isCorrect: false,
              text: "Event delegation is the process of adding to events that have bubbled up to a parent, rather than handling them directly on the element that triggered them.",
            },
          ],
          selected: [
            {
              $oid: "674d99cc274fd1320e98532e",
            },
          ],
          submissionTimeInMS: 1756827784349,
        },
      ],
    },
    {
      id: {
        $oid: "674d99e6274fd1320e985330",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d99e6274fd1320e985331",
          },
          text: "Which of the following is NOT an arithmetic operator in JavaScript?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d99fe274fd1320e985332",
              },
              isCorrect: false,
              text: "`%`",
            },
            {
              id: {
                $oid: "674d9a02274fd1320e985333",
              },
              isCorrect: true,
              text: "`==`",
            },
            {
              id: {
                $oid: "674d9a17274fd1320e985334",
              },
              isCorrect: false,
              text: "`-`",
            },
            {
              id: {
                $oid: "674d9a1a274fd1320e985335",
              },
              isCorrect: false,
              text: "`+`",
            },
          ],
          selected: [
            {
              $oid: "674d9a17274fd1320e985334",
            },
          ],
          submissionTimeInMS: 1756827787098,
        },
      ],
    },
    {
      id: {
        $oid: "674d9a22274fd1320e985336",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9a22274fd1320e985337",
          },
          text: "Which of the following `Math` object methods are used to raise a base to a power?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9a2e274fd1320e985338",
              },
              isCorrect: false,
              text: "`Math.exp(base, power)`",
            },
            {
              id: {
                $oid: "674d9a31274fd1320e985339",
              },
              isCorrect: false,
              text: "`Math.raise(base, power)`",
            },
            {
              id: {
                $oid: "674d9a3a274fd1320e98533a",
              },
              isCorrect: true,
              text: "`Math.pow(base, power)`",
            },
            {
              id: {
                $oid: "674d9a40274fd1320e98533b",
              },
              isCorrect: false,
              text: "`Math.e(base, power)`",
            },
          ],
          selected: [
            {
              $oid: "674d9a40274fd1320e98533b",
            },
          ],
          submissionTimeInMS: 1756827790051,
        },
      ],
    },
    {
      id: {
        $oid: "674d9a64274fd1320e98533c",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9a64274fd1320e98533d",
          },
          text: "Which of the following is the correct way to convert a string to an integer?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9a77274fd1320e98533e",
              },
              isCorrect: true,
              text: '`parseInt("300")`',
            },
            {
              id: {
                $oid: "674d9a7e274fd1320e98533f",
              },
              isCorrect: false,
              text: '`int("300")`',
            },
            {
              id: {
                $oid: "674d9a83274fd1320e985340",
              },
              isCorrect: false,
              text: '`integer("300")`',
            },
            {
              id: {
                $oid: "674d9a8a274fd1320e985341",
              },
              isCorrect: false,
              text: '`parseInteger("300")`',
            },
          ],
          selected: [
            {
              $oid: "674d9a7e274fd1320e98533f",
            },
          ],
          submissionTimeInMS: 1756827792914,
        },
      ],
    },
    {
      id: {
        $oid: "674d9a9b274fd1320e985342",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9a9b274fd1320e985343",
          },
          text: "Which of the following is true about global scope?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9ac4274fd1320e985344",
              },
              isCorrect: false,
              text: "Variables declared in the global scope are only accessible within the function where they are declared.",
            },
            {
              id: {
                $oid: "674d9ad4274fd1320e985345",
              },
              isCorrect: true,
              text: "Variables declared in the global scope are accessible from anywhere in the code.",
            },
            {
              id: {
                $oid: "674d9adf274fd1320e985346",
              },
              isCorrect: false,
              text: "Variables declared in the global scope are only accessible inside `for` loops and `if` statements.",
            },
            {
              id: {
                $oid: "674d9b0e274fd1320e985347",
              },
              isCorrect: false,
              text: "Variables declared in the global scope are only accessible inside arrow functions.",
            },
          ],
          selected: [
            {
              $oid: "674d9adf274fd1320e985346",
            },
          ],
          submissionTimeInMS: 1756827796475,
        },
      ],
    },
    {
      id: {
        $oid: "674d9b6a274fd1320e98534d",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9b6a274fd1320e98534e",
          },
          text: "Which of the following methods returns a boolean indicating whether the object has the specified property?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9b7a274fd1320e98534f",
              },
              isCorrect: false,
              text: "`hasProperty()`",
            },
            {
              id: {
                $oid: "674d9b85274fd1320e985350",
              },
              isCorrect: true,
              text: "`hasOwnProperty()`",
            },
            {
              id: {
                $oid: "674d9bc7274fd1320e985351",
              },
              isCorrect: false,
              text: "`hasOwnProps()`",
            },
            {
              id: {
                $oid: "674d9bcd274fd1320e985352",
              },
              isCorrect: false,
              text: "`hasOnlyProperties()`",
            },
          ],
          selected: [
            {
              $oid: "674d9b85274fd1320e985350",
            },
          ],
          submissionTimeInMS: 1756827799110,
        },
      ],
    },
    {
      id: {
        $oid: "674d9c10274fd1320e985353",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9c10274fd1320e985354",
          },
          text: "How do you correctly access an object value?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9c20274fd1320e985355",
              },
              isCorrect: false,
              text: "`obj -> key`",
            },
            {
              id: {
                $oid: "674d9c26274fd1320e985356",
              },
              isCorrect: false,
              text: "`obj#key`",
            },
            {
              id: {
                $oid: "674d9c30274fd1320e985357",
              },
              isCorrect: true,
              text: "`obj[key]`",
            },
            {
              id: {
                $oid: "674d9c50274fd1320e985358",
              },
              isCorrect: false,
              text: "`key[obj]`",
            },
          ],
          selected: [
            {
              $oid: "674d9c26274fd1320e985356",
            },
          ],
          submissionTimeInMS: 1756827802729,
        },
      ],
    },
    {
      id: {
        $oid: "674d9c9e274fd1320e985359",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9c9e274fd1320e98535a",
          },
          text: "Which of the following correctly accesses the value of `name` in an object called `person` using object destructuring? ",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9ca8274fd1320e98535b",
              },
              isCorrect: false,
              text: "`const name = person.name`",
            },
            {
              id: {
                $oid: "674d9cb1274fd1320e98535c",
              },
              isCorrect: false,
              text: '`const name = person["name"]`',
            },
            {
              id: {
                $oid: "674d9cb9274fd1320e98535d",
              },
              isCorrect: false,
              text: "`const { ...name } = person`",
            },
            {
              id: {
                $oid: "674d9cc0274fd1320e98535e",
              },
              isCorrect: true,
              text: "`const { name } = person`",
            },
          ],
          selected: [
            {
              $oid: "674d9ca8274fd1320e98535b",
            },
          ],
          submissionTimeInMS: 1756827805145,
        },
      ],
    },
    {
      id: {
        $oid: "674d9cdf274fd1320e98535f",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9cdf274fd1320e985360",
          },
          text: "What is JSON?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9d06274fd1320e985361",
              },
              isCorrect: false,
              text: "A markup language commonly used in documentation.",
            },
            {
              id: {
                $oid: "674d9d2c274fd1320e985362",
              },
              isCorrect: true,
              text: "A lightweight, text-based data format that is commonly used to exchange data between a server and a web application.",
            },
            {
              id: {
                $oid: "674d9d36274fd1320e985363",
              },
              isCorrect: false,
              text: "A commonly used JavaScript libraries for building user interfaces.",
            },
            {
              id: {
                $oid: "674d9d3c274fd1320e985364",
              },
              isCorrect: false,
              text: "A special type of linter used for JavaScript applications.",
            },
          ],
          selected: [
            {
              $oid: "674d9d36274fd1320e985363",
            },
          ],
          submissionTimeInMS: 1756827808129,
        },
      ],
    },
    {
      id: {
        $oid: "674d9d4f274fd1320e985365",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9d4f274fd1320e985366",
          },
          text: "Which of the following loops will execute the block of code at least once before checking the condition?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9d63274fd1320e985367",
              },
              isCorrect: false,
              text: "A `do...condition` loop.",
            },
            {
              id: {
                $oid: "674d9d66274fd1320e985368",
              },
              isCorrect: false,
              text: "A `while...check` loop.",
            },
            {
              id: {
                $oid: "674d9d82274fd1320e985369",
              },
              isCorrect: true,
              text: "A `do...while` loop.",
            },
            {
              id: {
                $oid: "674d9d89274fd1320e98536a",
              },
              isCorrect: false,
              text: "A `test...while` loop.",
            },
          ],
          selected: [
            {
              $oid: "674d9d82274fd1320e985369",
            },
          ],
          submissionTimeInMS: 1756827810312,
        },
      ],
    },
    {
      id: {
        $oid: "674d9dc3274fd1320e98536b",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9dc3274fd1320e98536c",
          },
          text: "What is the purpose of the `replace` method?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9dd7274fd1320e98536d",
              },
              isCorrect: false,
              text: "This method is used to find a specified value (like a word or character) in a string and replace it with `null`.",
            },
            {
              id: {
                $oid: "674d9df1274fd1320e98536e",
              },
              isCorrect: false,
              text: "This method is used to find a specified value (like a word or character) in a string and replace it with an empty string.",
            },
            {
              id: {
                $oid: "674d9e02274fd1320e98536f",
              },
              isCorrect: false,
              text: "This method is used to find a specified value (like a word or character) in a string and replace it with an array.",
            },
            {
              id: {
                $oid: "674d9e12274fd1320e985370",
              },
              isCorrect: true,
              text: "This method is used to find a specified value (like a word or character) in a string and replace it with another value.",
            },
          ],
          selected: [
            {
              $oid: "674d9df1274fd1320e98536e",
            },
          ],
          submissionTimeInMS: 1756827812576,
        },
      ],
    },
    {
      id: {
        $oid: "674d9e25274fd1320e985371",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9e25274fd1320e985372",
          },
          text: "What will be printed to the console?\n\n```js\nconsole.log(5 == '5');\n```",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9e31274fd1320e985373",
              },
              isCorrect: false,
              text: "`null`",
            },
            {
              id: {
                $oid: "674d9e3a274fd1320e985374",
              },
              isCorrect: false,
              text: "`undefined`",
            },
            {
              id: {
                $oid: "674d9e3f274fd1320e985375",
              },
              isCorrect: false,
              text: "`false`",
            },
            {
              id: {
                $oid: "674d9e49274fd1320e985376",
              },
              isCorrect: true,
              text: "`true`",
            },
          ],
          selected: [
            {
              $oid: "674d9e49274fd1320e985376",
            },
          ],
          submissionTimeInMS: 1756827815210,
        },
      ],
    },
    {
      id: {
        $oid: "674d9e56274fd1320e985377",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9e56274fd1320e985378",
          },
          text: "Which of the following is an example of using the ternary operator? ",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9e62274fd1320e985379",
              },
              isCorrect: false,
              text: "```js\nconst weather =  'sunny' : 'cool' ? temperature > 25;\n```",
            },
            {
              id: {
                $oid: "674d9e66274fd1320e98537a",
              },
              isCorrect: true,
              text: "```js\nconst weather = temperature > 25 ? 'sunny' : 'cool';\n```\n",
            },
            {
              id: {
                $oid: "674d9e8d274fd1320e98537b",
              },
              isCorrect: false,
              text: "```js\nconst weather = if temperature > 25 ? 'sunny' : 'cool';\n```",
            },
            {
              id: {
                $oid: "674d9e96274fd1320e98537c",
              },
              isCorrect: false,
              text: "```js\nconst weather =  'sunny' if temperature > 25 else 'cool';\n```\n",
            },
          ],
          selected: [
            {
              $oid: "674d9e66274fd1320e98537a",
            },
          ],
          submissionTimeInMS: 1756827817487,
        },
      ],
    },
    {
      id: {
        $oid: "674d9ea8274fd1320e98537d",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9ea8274fd1320e98537e",
          },
          text: "Which of the following is the correct way to update an element in an array?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9eb1274fd1320e98537f",
              },
              isCorrect: true,
              text: "```js\nconst fruits = ['apple', 'banana', 'cherry'];\nfruits[1] = 'blueberry';\n```",
            },
            {
              id: {
                $oid: "674d9eb9274fd1320e985380",
              },
              isCorrect: false,
              text: "```js\nconst fruits = ['apple', 'banana', 'cherry'];\nset fruits[1] = 'blueberry';\n```",
            },
            {
              id: {
                $oid: "674d9ec0274fd1320e985381",
              },
              isCorrect: false,
              text: "```js\nconst fruits = ['apple', 'banana', 'cherry'];\nfruits[1] <<< 'blueberry';\n```",
            },
            {
              id: {
                $oid: "674d9ec4274fd1320e985382",
              },
              isCorrect: false,
              text: "```js\nconst fruits = ['apple', 'banana', 'cherry'];\nconst {fruits[1]} = 'blueberry';\n```",
            },
          ],
          selected: [
            {
              $oid: "674d9eb1274fd1320e98537f",
            },
          ],
          submissionTimeInMS: 1756827819634,
        },
      ],
    },
    {
      id: {
        $oid: "674d9f54274fd1320e985383",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9f54274fd1320e985384",
          },
          text: "Which of the following examples is the correct way to create a shallow copy of an array?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9f81274fd1320e985387",
              },
              isCorrect: false,
              text: "```js\nconst shallowCopiedArray = {...originalArray};\n```",
            },
            {
              id: {
                $oid: "674d9f88274fd1320e985388",
              },
              isCorrect: false,
              text: "```js\nconst shallowCopiedArray = ...originalArray;\n```",
            },
            {
              id: {
                $oid: "674d9f8f274fd1320e985389",
              },
              isCorrect: true,
              text: "```js\nconst shallowCopiedArray = [...originalArray];\n```",
            },
            {
              id: {
                $oid: "674d9f92274fd1320e98538a",
              },
              isCorrect: false,
              text: "```js\nconst shallowCopiedArray = <...originalArray>;\n```",
            },
          ],
          selected: [
            {
              $oid: "674d9f8f274fd1320e985389",
            },
          ],
          submissionTimeInMS: 1756827823004,
        },
      ],
    },
    {
      id: {
        $oid: "674d9f7e274fd1320e985385",
      },
      type: "MultipleChoice",
      context: "",
      questions: [
        {
          id: {
            $oid: "674d9f7e274fd1320e985386",
          },
          text: "Which of the following is NOT an example of a primitive data type?",
          tags: [],
          deprecated: false,
          audio: null,
          answers: [
            {
              id: {
                $oid: "674d9fe9274fd1320e98538d",
              },
              isCorrect: false,
              text: "`number`",
            },
            {
              id: {
                $oid: "674d9feb274fd1320e98538e",
              },
              isCorrect: true,
              text: "`array`",
            },
            {
              id: {
                $oid: "674d9ff3274fd1320e98538f",
              },
              isCorrect: false,
              text: "`string`\n",
            },
            {
              id: {
                $oid: "674d9fff274fd1320e985390",
              },
              isCorrect: false,
              text: "`boolean`",
            },
          ],
          selected: [
            {
              $oid: "674d9fe9274fd1320e98538d",
            },
          ],
          submissionTimeInMS: 1756827826263,
        },
      ],
    },
  ],
  config: {
    name: "JavaScript Exam",
    note: "",
    tags: [],
    totalTimeInMS: 1800000,
    questionSets: [
      {
        type: "MultipleChoice",
        numberOfSet: 50,
        numberOfQuestions: 1,
        numberOfCorrectAnswers: 1,
        numberOfIncorrectAnswers: 3,
      },
    ],
    retakeTimeInMS: 8640000000,
    passingPercent: 80,
  },
};

const deserializedAttempt: Attempt = deserializeToPrisma(attempt);

const id = deserializedAttempt.id;

if (id !== attempt.id.$oid) {
  throw new Error(`Expected id to be ${attempt.id.$oid}, but got ${id}`);
}

const questionSets = deserializedAttempt.questionSets;

for (let i = 0; i < questionSets.length; i++) {
  const qs = questionSets[i];
  const id = qs.id;

  if (id !== attempt.questionSets[i].id.$oid) {
    throw new Error(
      `Expected question set id to be ${attempt.questionSets[i].id.$oid}, but got ${id}`
    );
  }

  const questions = qs.questions;

  for (let j = 0; j < questions.length; j++) {
    const q = questions[j];
    const qid = q.id;

    if (qid !== attempt.questionSets[i].questions[j].id.$oid) {
      throw new Error(
        `Expected question id to be ${attempt.questionSets[i].questions[j].id.$oid}, but got ${qid}`
      );
    }

    const selected = q.selected;

    if (
      selected.length !== attempt.questionSets[i].questions[j].selected.length
    ) {
      throw new Error(
        `Expected selected length to be ${attempt.questionSets[i].questions[j].selected.length}, but got ${selected.length}`
      );
    }

    for (let k = 0; k < selected.length; k++) {
      const sid = selected[k];

      if (sid !== attempt.questionSets[i].questions[j].selected[k].$oid) {
        throw new Error(
          `Expected selected id to be ${attempt.questionSets[i].questions[j].selected[k].$oid}, but got ${sid}`
        );
      }
    }

    const answers = q.answers;

    for (let k = 0; k < answers.length; k++) {
      const a = answers[k];
      const aid = a.id;

      if (aid !== attempt.questionSets[i].questions[j].answers[k].id.$oid) {
        throw new Error(
          `Expected answer id to be ${attempt.questionSets[i].questions[j].answers[k].id.$oid}, but got ${aid}`
        );
      }
    }
  }
}

// ------
// SESSION USER TEST
// ------

const sessionUser: SessionUser = {
  activity: {
    lastActive: Date.now(),
    // @ts-expect-error This is changed
    page: "/",
  },
  email: "camperbot@freecodecamp.org",
  name: "Camperbot",
  picture: "",
  settings: {
    databaseEnvironment: "Staging",
  },
  webSocketToken: "",
};

// @ts-expect-error TODO: Investigate - probably activity.page being URL
const deserializedSessionUser: SessionUser = deserializeToPrisma(sessionUser);

if (deserializedSessionUser.email !== sessionUser.email) {
  throw new Error(
    `Expected email to be ${sessionUser.email}, but got ${deserializedSessionUser.email}`
  );
}

if (deserializedSessionUser.name !== sessionUser.name) {
  throw new Error(
    `Expected name to be ${sessionUser.name}, but got ${deserializedSessionUser.name}`
  );
}

if (deserializedSessionUser.picture !== sessionUser.picture) {
  throw new Error(
    `Expected picture to be ${sessionUser.picture}, but got ${deserializedSessionUser.picture}`
  );
}

if (
  deserializedSessionUser.settings?.databaseEnvironment !==
  sessionUser.settings?.databaseEnvironment
) {
  throw new Error(
    `Expected databaseEnvironment to be ${sessionUser.settings?.databaseEnvironment}, but got ${deserializedSessionUser.settings?.databaseEnvironment}`
  );
}

if (deserializedSessionUser.webSocketToken !== sessionUser.webSocketToken) {
  throw new Error(
    `Expected webSocketToken to be ${sessionUser.webSocketToken}, but got ${deserializedSessionUser.webSocketToken}`
  );
}

const sessionUserLastActive = deserializedSessionUser.activity?.lastActive ?? 0;
const originalLastActive = sessionUser.activity?.lastActive ?? 0;

// Allow a difference of up to 1000ms to account for any processing delays
if (Math.abs(sessionUserLastActive - originalLastActive) > 1000) {
  throw new Error(
    `Expected lastActive to be approximately ${originalLastActive}, but got ${sessionUserLastActive}`
  );
}

if (
  deserializedSessionUser.activity.page.href !== sessionUser.activity.page.href
) {
  throw new Error(
    `Expected page href to be ${sessionUser.activity.page.href}, but got ${deserializedSessionUser.activity.page.href}`
  );
}
