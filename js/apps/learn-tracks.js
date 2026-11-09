/* SYNAPSE — rutas de JavaScript y C++ / Arduino: 10 etapas × 50 niveles × 5 ejercicios cada una.
   Los niveles se generan con una semilla fija (siempre iguales). En JavaScript la salida correcta se calcula ejecutando el código de verdad;
   en C++ cada plantilla calcula su salida esperada en JS. Reutiliza el kit de ejercicios de learn-path.js. */
(function () {
  const K = window.NEXUS_PATH && window.NEXUS_PATH.kit;
  if (!K) return;
  const { rng, ri, pk, shuf, wrongs, C, TF, OR, PR, WORDS, sc } = K;
  const PER = 50;
  const N5 = (r, t, base, span) => ri(r, 1, sc(t, base, span));

  const jsEval = (code) => {
    const o = [];
    const con = { log: (...a) => o.push(a.map((x) => (typeof x === 'string' ? x : String(x))).join(' ')) };
    try { new Function('console', code)(con); } catch (e) { o.push('ERR:' + e.name); }
    return o.join('\n');
  };
  const GROUPS = [['par', 'impar'], ['A', 'B', 'C', 'D'], ['uno', 'dostres', 'tres', 'otro'], ['uno', 'dos\ntres', 'tres', 'otro', 'dos'], ['mayor', 'menor o igual'], ['si', 'no'], ['1', '0']];
  const BAD = (a, r) => {
    if (a === 'true' || a === 'false') return shuf(r, [a === 'true' ? 'false' : 'true', 'undefined', 'null']);
    if (a === 'undefined') return ['null', '0', 'false'];
    for (const g of GROUPS) if (g.includes(a)) return shuf(r, g.filter((x) => x !== a).concat(['Nada', 'Error'])).slice(0, 3);
    return wrongs(a, r);
  };
  function cho(r, o, ev) {
    const out = o.out !== undefined ? String(o.out) : ev(o.code);
    const w = (o.bad || BAD(out, r)).filter((x) => x !== out);
    const opts = shuf(r, [out, ...w.slice(0, 3)]);
    return { t: 'choice', q: o.q || '¿Qué muestra este código?', code: o.code, opts, a: opts.indexOf(out), why: o.why || '', chk: { code: o.code, out } };
  }
  function fil(o, ev) {
    const code = o.code.replace('___', o.a[0]);
    return { t: 'fill', q: o.q, code: o.code, a: o.a, why: o.why || '', chk: { code, out: o.out !== undefined ? String(o.out) : ev(code) } };
  }
  /* constructor genérico de pista: 5 ejercicios por nivel, dificultad creciente */
  function builder(stages, ev) {
    return function build(si, li) {
      const S = stages[si], r = rng((si + 1) * 1009 + (li + 1) * 7919 + (S.seed || 0)), t = li / (PER - 1), T = S.T;
      const i1 = Math.floor(r() * T.length), i2 = (i1 + 1 + Math.floor(r() * (T.length - 1))) % T.length, i3 = Math.floor(r() * T.length), hard = Math.min(1, t + 0.25);
      const mk = (f, tt) => { const x = f(r, tt); return x.raw ? x.raw : cho(r, x, ev); };
      return [mk(T[i1], t), fil(S.F[li % S.F.length](r, t), ev), S.C[(li * 5 + si) % S.C.length], mk(T[i2], t), mk(T[i3], hard)];
    };
  }
  function track(id, name, stages, ev) {
    const build = builder(stages, ev);
    return { id, name, per: PER, stages: stages.map((s, i) => ({ n: i + 1, name: s.name, icon: s.icon, color: s.color, desc: s.desc, tip: s.tip, demo: s.demo })), level: (si, li) => ({ title: `Etapa ${si + 1} · Nivel ${li + 1}`, ex: build(si, li) }), stars: (si, li) => 1 + Math.floor((si * PER + li) / 100), build };
  }
  const W = () => pk(Math.random, WORDS);   // sólo para comodidad en definiciones de conceptos (no en niveles)

  /* =====================================================  JAVASCRIPT  ===================================================== */
  const NV = ['x', 'n', 'total', 'puntos', 'edad', 'vidas'];
  const JS = [
    { name: 'Primeros pasos', icon: '🌱', color: '#f7df1e', desc: 'console.log, let, const y tipos', seed: 1,
      tip: 'console.log() muestra información. let crea variables que pueden cambiar; const crea constantes. typeof dice el tipo (number, string, boolean, undefined, object). // inicia un comentario.',
      demo: 'let edad = 15;\nconst pais = "Chile";\nconsole.log(typeof edad); // number',
      T: [
        (r, t) => { const w = pk(r, WORDS), v = pk(r, WORDS.filter((x) => x !== w)); return { code: t < 0.4 ? `console.log("${w}");` : t < 0.75 ? `console.log("${w}" + "${v}");` : `console.log("${w}", "${v}", ${ri(r, 1, 9)});` }; },
        (r, t) => { const n = pk(r, NV), a = N5(r, t, 9, 90), b = N5(r, t, 9, 90); return { code: t < 0.5 ? `let ${n} = ${a};\nconsole.log(${n});` : `let ${n} = ${a};\n${n} = ${b};\nconsole.log(${n});` }; },
        (r) => { const l = pk(r, ['42', '3.14', '"hola"', 'true', 'undefined', 'null', '[1, 2]', '{}']); return { code: `console.log(typeof ${l});`, why: 'typeof null y typeof [] devuelven "object".' }; },
        (r, t) => { const n = pk(r, NV), a = N5(r, t, 9, 60); return { code: `const ${n} = ${a};\n// ${pk(r, WORDS)}\nconsole.log(${n} + 1);` }; },
      ],
      F: [(r) => ({ q: 'Completa para mostrar en consola:', code: `___.log("${pk(r, WORDS)}");`, a: ['console'] }),
        (r) => { const n = pk(r, NV), a = ri(r, 2, 99); return { q: 'Escribe la variable para mostrar su valor:', code: `let ${n} = ${a};\nconsole.log(___);`, a: [n] }; },
        (r) => ({ q: 'Completa el símbolo de comentario de una línea:', code: `___ nota\nconsole.log("${pk(r, WORDS)}");`, a: ['//'] })],
      C: [TF('JavaScript distingue mayúsculas de minúsculas.', true, 'nombre y Nombre son variables distintas.'), TF('Una variable const puede reasignarse.', false, 'const no permite reasignar.'), C('¿Con qué palabra declaras una variable que cambiará?', ['let', 'const', 'fix', 'def'], 0), PR('Relaciona:', [['//', 'Comentario'], ['let', 'Variable reasignable'], ['const', 'Constante'], ['console.log()', 'Muestra en consola']]), C('¿Qué devuelve typeof "hola"?', ['string', 'text', 'str', 'char'], 0)] },

    { name: 'Operadores y textos', icon: '➕', color: '#19d3ff', desc: 'aritmética, comparaciones y métodos de string', seed: 2,
      tip: 'Operadores: + - * / % **. La multiplicación va antes que la suma. === compara valor y tipo. Los strings tienen métodos: toUpperCase(), slice(), includes(), repeat() y la propiedad length. Las plantillas `texto ${x}` insertan valores.',
      demo: 'console.log(2 + 3 * 4);      // 14\nconsole.log("hola".length);  // 4\nconsole.log(`Suma: ${1 + 2}`);',
      T: [
        (r, t) => { const a = N5(r, t, 9, 40), b = N5(r, t, 9, 40), c = N5(r, t, 5, 20); return { code: t < 0.5 ? `console.log(${a} + ${b} * ${c});` : `console.log((${a} + ${b}) * ${c} - ${a});`, why: 'La multiplicación se evalúa antes que la suma; los paréntesis mandan.' }; },
        (r, t) => { const a = N5(r, t, 20, 90), b = ri(r, 2, 9); return { code: pk(r, [`console.log(${a} % ${b});`, `console.log(Math.floor(${a} / ${b}));`, `console.log(${b} ** ${ri(r, 2, 4)});`]) }; },
        (r, t) => { const w = pk(r, WORDS.filter((x) => x.length > 2)), op = pk(r, [`s.toUpperCase()`, `s.length`, `s.slice(1, 3)`, `s[0]`, `s.repeat(2)`, `s.includes("${w[1]}")`, `s.indexOf("${w[w.length - 1]}")`]); return { code: `const s = "${w}";\nconsole.log(${op});` }; },
        (r, t) => { const w = pk(r, WORDS), a = N5(r, t, 9, 30), b = N5(r, t, 9, 30); return { code: pk(r, ['const n = "' + w + '";\nconsole.log(`Hola ${n}, ${' + a + ' + ' + b + '}`);', `console.log("${a}" + ${b}, "${a}" - ${b});`, `console.log(${a} === "${a}", ${a} == "${a}");`]), why: '"5" + 3 concatena; "5" - 3 resta; == convierte tipos y === no.' }; },
      ],
      F: [(r) => ({ q: 'Operador para el resto de la división:', code: `console.log(${ri(r, 20, 90)} ___ ${ri(r, 3, 9)});`, a: ['%'] }),
        (r) => ({ q: 'Propiedad que da la cantidad de caracteres:', code: `const s = "${pk(r, WORDS)}";\nconsole.log(s.___);`, a: ['length'] }),
        (r) => { const w = pk(r, WORDS); return { q: 'Completa para interpolar la variable:', code: 'const n = "' + w + '";\nconsole.log(`Hola ${___}`);', a: ['n'] }; }],
      C: [TF('"5" + 3 da 53 en JavaScript.', true, 'Con un string, + concatena.'), TF('=== compara también el tipo.', true), C('¿Qué operador eleva un número a una potencia?', ['**', '^', '%%', '//'], 0), PR('Relaciona:', [['%', 'Resto'], ['**', 'Potencia'], ['===', 'Igualdad estricta'], ['`${}`', 'Interpolación']]), C('¿Qué método pasa un texto a mayúsculas?', ['toUpperCase()', 'upper()', 'toCaps()', 'big()'], 0)] },

    { name: 'Decisiones', icon: '🔀', color: '#ffb000', desc: 'if, else, &&, ||, ternario y switch', seed: 3,
      tip: 'if evalúa una condición; else if añade casos; else es lo demás. && (y), || (o) y ! (no) combinan condiciones. El ternario `cond ? a : b` es un if corto. switch compara contra varios valores; sin break sigue al siguiente caso.',
      demo: 'let nota = 7;\nif (nota >= 6) console.log("aprobó");\nelse console.log("repite");',
      T: [
        (r, t) => { const a = N5(r, t, 20, 80), b = N5(r, t, 20, 80); return { code: `let n = ${a};\nif (n > ${b}) {\n  console.log("mayor");\n} else {\n  console.log("menor o igual");\n}` }; },
        (r, t) => { const a = N5(r, t, 30, 70); return { code: `const p = ${a};\nif (p >= 90) console.log("A");\nelse if (p >= 60) console.log("B");\nelse if (p >= 40) console.log("C");\nelse console.log("D");` }; },
        (r, t) => { const a = N5(r, t, 9, 20), b = N5(r, t, 9, 20), c = N5(r, t, 9, 20); return { code: pk(r, [`console.log(${a} > ${b} && ${b} > ${c});`, `console.log(${a} > ${b} || ${b} > ${c});`, `console.log(!(${a} > ${b}));`, `console.log(${a} > ${b} ? "si" : "no");`]) }; },
        (r, t) => { const n = ri(r, 1, 4); return { code: `const d = ${n};\nswitch (d) {\n  case 1: console.log("uno"); break;\n  case 2: console.log("dos");\n  case 3: console.log("tres"); break;\n  default: console.log("otro");\n}`, why: 'Sin break el caso 2 continúa en el 3.' }; },
      ],
      F: [(r) => ({ q: 'Completa la palabra clave de la rama final:', code: `if (${ri(r, 1, 5)} > ${ri(r, 6, 9)}) console.log("a");\n___ console.log("b");`, a: ['else'] }),
        (r) => ({ q: 'Operador lógico "y":', code: `console.log(${ri(r, 5, 9)} > 3 ___ ${ri(r, 1, 2)} < 3);`, a: ['&&'], out: 'true' }),
        (r) => ({ q: 'Completa el ternario:', code: `const x = ${ri(r, 1, 9)};\nconsole.log(x > 4 ___ "grande" : "pequeño");`, a: ['?'] })],
      C: [TF('else if puede repetirse varias veces.', true), TF('Un switch sin break se detiene solo.', false, 'Sin break continúa al siguiente caso.'), C('¿Qué operador representa "o" lógico?', ['||', '&&', '!', '??'], 0), PR('Relaciona:', [['&&', 'Y'], ['||', 'O'], ['!', 'No'], ['? :', 'Ternario']]), C('¿Cuál NO es un valor falsy?', ['"0"', '0', '""', 'null'], 0, '"0" es un texto no vacío, así que es truthy.')] },

    { name: 'Bucles', icon: '🔁', color: '#ff6bcb', desc: 'for, while, break, continue y bucles anidados', seed: 4,
      tip: 'for (inicio; condición; paso) repite un bloque. while repite mientras la condición sea verdadera. break sale del bucle y continue salta a la siguiente vuelta. Puedes anidar bucles.',
      demo: 'let s = 0;\nfor (let i = 1; i <= 3; i++) s += i;\nconsole.log(s); // 6',
      T: [
        (r, t) => { const n = N5(r, t, 4, 14); return { code: `let s = 0;\nfor (let i = 1; i <= ${n}; i++) {\n  s += i;\n}\nconsole.log(s);` }; },
        (r, t) => { const n = N5(r, t, 3, 6), k = ri(r, 2, 3); return { code: `let x = 1, c = 0;\nwhile (x < ${n * 20}) {\n  x *= ${k};\n  c++;\n}\nconsole.log(c);` }; },
        (r, t) => { const n = N5(r, t, 5, 8), k = ri(r, 2, 4); return { code: `let out = "";\nfor (let i = 1; i <= ${n}; i++) {\n  if (i % ${k} === 0) continue;\n  if (i > ${n - 1}) break;\n  out += i;\n}\nconsole.log(out);`, why: 'continue salta la vuelta; break termina el bucle.' }; },
        (r, t) => { const a = ri(r, 2, 4), b = N5(r, t, 2, 3); return { code: `let c = 0;\nfor (let i = 0; i < ${a}; i++) {\n  for (let j = 0; j < ${b}; j++) c++;\n}\nconsole.log(c);`, why: 'Vueltas totales = externas × internas.' }; },
      ],
      F: [(r) => ({ q: 'Completa la palabra clave del bucle:', code: `___ (let i = 0; i < ${ri(r, 3, 6)}; i++) {\n  console.log(i);\n}`, a: ['for'] }),
        (r) => ({ q: 'Operador para sumar 1 a i:', code: `let i = ${ri(r, 1, 5)};\ni___;\nconsole.log(i);`, a: ['++'] }),
        (r) => ({ q: 'Palabra clave para salir del bucle:', code: `for (let i = 0; i < 9; i++) {\n  if (i === ${ri(r, 2, 4)}) ___;\n  console.log(i);\n}`, a: ['break'] })],
      C: [TF('Un while puede no ejecutarse nunca.', true, 'Si la condición empieza en falso, no corre.'), TF('i++ resta uno.', false), C('¿Qué hace continue?', ['Salta a la siguiente vuelta', 'Sale del bucle', 'Detiene el programa', 'Reinicia el bucle'], 0), PR('Relaciona:', [['for', 'Repite un número conocido de veces'], ['while', 'Repite mientras se cumpla'], ['break', 'Sale del bucle'], ['continue', 'Salta una vuelta']]), C('¿Cuántas veces corre for (let i=0;i<5;i++)?', ['5', '4', '6', 'Infinitas'], 0)] },

    { name: 'Arreglos', icon: '📋', color: '#c586f0', desc: 'índices, push/pop, slice y recorridos', seed: 5,
      tip: 'Un arreglo guarda una lista ordenada y empieza en el índice 0. push() añade al final, pop() quita el último, shift()/unshift() actúan al inicio. slice(a,b) copia un tramo; join() los une en un texto; length da el tamaño.',
      demo: 'const a = [10, 20, 30];\na.push(40);\nconsole.log(a[1], a.length); // 20 4',
      T: [
        (r, t) => { const a = Array.from({ length: ri(r, 3, 5) }, () => ri(r, 1, sc(t, 9, 40))), i = ri(r, 0, a.length - 1); return { code: `const a = [${a.join(', ')}];\nconsole.log(a[${i}], a.length);` }; },
        (r, t) => { const a = Array.from({ length: 3 }, () => ri(r, 1, sc(t, 9, 30))), v = ri(r, 1, 50); return { code: pk(r, [`const a = [${a.join(', ')}];\na.push(${v});\nconsole.log(a.join("-"));`, `const a = [${a.join(', ')}];\na.pop();\nconsole.log(a.join("-"), a.length);`, `const a = [${a.join(', ')}];\na.unshift(${v});\nconsole.log(a.join("-"));`]) }; },
        (r, t) => { const a = Array.from({ length: 5 }, () => ri(r, 1, sc(t, 9, 40))), i = ri(r, 0, 2); return { code: `const a = [${a.join(', ')}];\nconsole.log(a.slice(${i}, ${i + 2}).join(","));`, why: 'slice(a, b) incluye a y excluye b.' }; },
        (r, t) => { const a = Array.from({ length: ri(r, 4, 6) }, () => ri(r, 1, sc(t, 9, 30))); return { code: `const a = [${a.join(', ')}];\nlet s = 0;\nfor (const x of a) {\n  if (x % 2 === 0) s += x;\n}\nconsole.log(s);` }; },
      ],
      F: [(r) => ({ q: 'Método que añade al final:', code: `const a = [1, 2];\na.___(${ri(r, 3, 9)});\nconsole.log(a.length);`, a: ['push'] }),
        (r) => { const a = [ri(r, 1, 9), ri(r, 10, 19), ri(r, 20, 29)]; return { q: 'Índice del primer elemento:', code: `const a = [${a.join(', ')}];\nconsole.log(a[___]);`, a: ['0'] }; },
        (r) => ({ q: 'Propiedad con el tamaño del arreglo:', code: `const a = [${[1, 2, 3, 4].slice(0, ri(r, 2, 4)).join(', ')}];\nconsole.log(a.___);`, a: ['length'] })],
      C: [TF('El primer elemento de un arreglo está en el índice 1.', false, 'Empieza en 0.'), TF('pop() quita el último elemento.', true), C('¿Qué devuelve [1,2,3].indexOf(9)?', ['-1', '0', 'undefined', 'null'], 0), PR('Relaciona:', [['push', 'Añade al final'], ['pop', 'Quita el último'], ['shift', 'Quita el primero'], ['unshift', 'Añade al inicio']]), C('¿Qué hace join(",")?', ['Une los elementos en un texto', 'Ordena', 'Duplica', 'Filtra'], 0)] },

    { name: 'Funciones', icon: '⚙', color: '#7c9cff', desc: 'parámetros, return, flechas y ámbito', seed: 6,
      tip: 'Una función agrupa código reutilizable: function nombre(a, b) { return a + b; }. return devuelve un valor y termina la función. Las flechas son una forma corta: (a, b) => a + b. Las variables creadas dentro de una función no existen fuera de ella.',
      demo: 'function doble(x) {\n  return x * 2;\n}\nconsole.log(doble(4)); // 8',
      T: [
        (r, t) => { const k = ri(r, 2, 9), a = N5(r, t, 9, 40); return { code: `function f(x) {\n  return x * ${k} + 1;\n}\nconsole.log(f(${a}));` }; },
        (r, t) => { const a = N5(r, t, 9, 30), b = N5(r, t, 9, 30); return { code: `const suma = (a, b = ${ri(r, 1, 9)}) => a + b;\nconsole.log(suma(${a}), suma(${a}, ${b}));`, why: 'Si no pasas b, se usa su valor por defecto.' }; },
        (r, t) => { const a = N5(r, t, 9, 30); return { code: `let x = ${a};\nfunction g() {\n  let x = ${a + 5};\n  return x;\n}\nconsole.log(g(), x);`, why: 'La x de dentro es otra variable (ámbito local).' }; },
        (r, t) => { const n = ri(r, 3, 5 + Math.floor(t * 3)); return { code: `function fact(n) {\n  return n <= 1 ? 1 : n * fact(n - 1);\n}\nconsole.log(fact(${n}));` }; },
      ],
      F: [(r) => ({ q: 'Palabra clave para devolver un valor:', code: `function f(a, b) {\n  ___ a + b;\n}\nconsole.log(f(${ri(r, 1, 9)}, ${ri(r, 1, 9)}));`, a: ['return'] }),
        (r) => ({ q: 'Completa la flecha:', code: `const doble = (x) ___ x * 2;\nconsole.log(doble(${ri(r, 2, 9)}));`, a: ['=>'] }),
        (r) => ({ q: 'Palabra clave para declarar una función:', code: `___ hola() {\n  console.log("${pk(r, WORDS)}");\n}\nhola();`, a: ['function'] })],
      C: [TF('Una función sin return devuelve undefined.', true), TF('Las variables locales se ven desde fuera de la función.', false), C('¿Cómo se llama a una función llamada saludar?', ['saludar()', 'call saludar', 'saludar{}', 'run(saludar)'], 0), PR('Relaciona:', [['return', 'Devuelve un valor'], ['=>', 'Función flecha'], ['parámetro', 'Dato de entrada'], ['ámbito', 'Dónde vive una variable']]), C('¿Qué es un parámetro por defecto?', ['Un valor que se usa si no pasas argumento', 'Un error', 'Una función global', 'Un bucle'], 0)] },

    { name: 'Objetos y JSON', icon: '🗂', color: '#ff7a59', desc: 'propiedades, métodos, desestructuración y JSON', seed: 7,
      tip: 'Un objeto guarda pares clave: valor. Se accede con obj.clave u obj["clave"]. Object.keys() lista las claves. La desestructuración extrae valores: const { a } = obj. JSON.stringify() convierte a texto y JSON.parse() lo devuelve a objeto.',
      demo: 'const p = { nombre: "Ana", edad: 15 };\nconsole.log(p.nombre, Object.keys(p).length);',
      T: [
        (r, t) => { const a = N5(r, t, 9, 60), b = N5(r, t, 9, 60); return { code: `const o = { a: ${a}, b: ${b} };\no.c = o.a + o.b;\nconsole.log(o.c, Object.keys(o).length);` }; },
        (r, t) => { const a = N5(r, t, 9, 60); const w = pk(r, WORDS); return { code: `const o = { ${w}: ${a}, ok: true };\nconsole.log(JSON.stringify(o));` }; },
        (r, t) => { const a = N5(r, t, 9, 60), b = N5(r, t, 9, 60); return { code: `const { x, y } = { x: ${a}, y: ${b} };\nconsole.log(x - y);` }; },
        (r, t) => { const a = N5(r, t, 9, 60), b = N5(r, t, 9, 60); return { code: `const base = { a: ${a} };\nconst nuevo = { ...base, b: ${b}, a: ${a + 1} };\nconsole.log(JSON.stringify(nuevo));`, why: 'En el spread, la última clave repetida gana.' }; },
      ],
      F: [(r) => { const w = pk(r, WORDS), a = ri(r, 2, 99); return { q: 'Accede a la propiedad:', code: `const o = { ${w}: ${a} };\nconsole.log(o.___);`, a: [w] }; },
        (r) => ({ q: 'Convierte el objeto en texto JSON:', code: `console.log(JSON.___({ a: ${ri(r, 1, 9)} }));`, a: ['stringify'] }),
        (r) => ({ q: 'Lista las claves del objeto:', code: `console.log(Object.___({ a: 1, b: 2 }).length);`, a: ['keys'] })],
      C: [TF('JSON.parse convierte un texto JSON en objeto.', true), TF('Un objeto de JavaScript usa corchetes [] para sus claves y valores.', false, 'Usa llaves {}.'), C('¿Cómo accedes a la clave "edad" de un objeto p?', ['p.edad', 'p->edad', 'p::edad', 'edad(p)'], 0), PR('Relaciona:', [['Object.keys', 'Lista de claves'], ['JSON.stringify', 'Objeto a texto'], ['JSON.parse', 'Texto a objeto'], ['{ ...a }', 'Copia (spread)']]), C('¿Qué hace const { a } = obj?', ['Extrae obj.a en la variable a', 'Crea un objeto', 'Borra a', 'Compara a'], 0)] },

    { name: 'Métodos de arreglos', icon: '🧪', color: '#35f2a0', desc: 'map, filter, reduce, find, sort y más', seed: 8,
      tip: 'map() transforma cada elemento y devuelve otro arreglo; filter() conserva los que cumplen una condición; reduce() acumula un único valor; find() devuelve el primero que cumple; some()/every() responden si alguno/todos cumplen; sort() ordena (cuidado: por defecto compara como texto).',
      demo: 'const n = [1, 2, 3, 4];\nconsole.log(n.map(x => x * 2).join());  // 2,4,6,8\nconsole.log(n.filter(x => x > 2).length); // 2',
      T: [
        (r, t) => { const a = Array.from({ length: 4 }, () => ri(r, 1, sc(t, 9, 30))), k = ri(r, 2, 5); return { code: `const a = [${a.join(', ')}];\nconsole.log(a.map((x) => x * ${k}).join(","));` }; },
        (r, t) => { const a = Array.from({ length: 6 }, () => ri(r, 1, sc(t, 9, 30))), k = ri(r, 4, 12); return { code: `const a = [${a.join(', ')}];\nconsole.log(a.filter((x) => x > ${k}).join(","));` }; },
        (r, t) => { const a = Array.from({ length: ri(r, 3, 5) }, () => ri(r, 1, sc(t, 9, 30))); return { code: pk(r, [`const a = [${a.join(', ')}];\nconsole.log(a.reduce((s, x) => s + x, 0));`, `const a = [${a.join(', ')}];\nconsole.log(a.reduce((m, x) => (x > m ? x : m), 0));`, `const a = [${a.join(', ')}];\nconsole.log(a.some((x) => x > 20), a.every((x) => x > 0));`]) }; },
        (r, t) => { const a = Array.from({ length: 5 }, () => ri(r, 1, 40)); return { code: pk(r, [`const a = [${a.join(', ')}];\nconsole.log(a.slice().sort((x, y) => x - y).join(","));`, `const a = [${a.join(', ')}];\nconsole.log(a.find((x) => x > 15));`, `console.log([10, 9, 1].sort().join(","));`]), why: 'sort() sin función compara como texto: "10" < "9".' }; },
      ],
      F: [(r) => ({ q: 'Método que transforma cada elemento:', code: `console.log([1, 2, 3].___((x) => x * ${ri(r, 2, 5)}).join(","));`, a: ['map'] }),
        (r) => ({ q: 'Método que filtra elementos:', code: `console.log([1, 5, 8, 12].___((x) => x > ${ri(r, 2, 9)}).length);`, a: ['filter'] }),
        (r) => ({ q: 'Método que acumula en un solo valor:', code: `console.log([1, 2, 3, 4].___((s, x) => s + x, 0));`, a: ['reduce'] })],
      C: [TF('map() modifica el arreglo original.', false, 'Devuelve uno nuevo.'), TF('filter() devuelve un arreglo.', true), C('¿Qué hace [1,2,3].reduce((s,x)=>s+x,0)?', ['Suma los elementos', 'Los multiplica', 'Los ordena', 'Los invierte'], 0), PR('Relaciona:', [['map', 'Transformar'], ['filter', 'Seleccionar'], ['reduce', 'Acumular'], ['find', 'Primer elemento que cumple']]), C('¿Qué devuelve find si nadie cumple?', ['undefined', 'null', '-1', 'false'], 0)] },

    { name: 'DOM y eventos', icon: '🖱', color: '#38d6e8', desc: 'seleccionar, modificar y escuchar eventos', seed: 9,
      tip: 'El DOM es el árbol de la página. document.querySelector("#id") selecciona un elemento; .textContent cambia su texto; .classList.add() añade una clase; addEventListener("click", fn) reacciona a un clic; createElement() crea nodos nuevos y append() los inserta.',
      demo: 'const b = document.querySelector("#boton");\nb.addEventListener("click", () => {\n  b.textContent = "¡Hecho!";\n});',
      T: [
        (r) => { const id = pk(r, ['boton', 'titulo', 'lista', 'caja', 'menu']); const ops = [[`document.querySelector("#${id}")`, `Selecciona el elemento con id ${id}`, ['Crea un elemento', 'Borra el elemento', 'Cambia su color']], [`document.querySelector(".${id}")`, `Selecciona el primer elemento con clase ${id}`, ['Selecciona por id', 'Selecciona todos', 'Crea una clase']], [`document.getElementById("${id}")`, `Busca el elemento por su id ${id}`, ['Busca por clase', 'Busca por etiqueta', 'Crea el id']]]; const [c, a, w] = pk(r, ops); return { raw: { t: 'choice', q: '¿Qué hace esta línea?', code: c, opts: shuf(r, [a, ...w]), a: 0, why: '' } }; },
        (r) => { const pr = [['textContent', 'Cambia el texto de un elemento'], ['classList.add', 'Añade una clase CSS'], ['style.color', 'Cambia el color en línea'], ['value', 'Lee lo escrito en un input'], ['innerHTML', 'Lee o escribe HTML interno']], [p, a] = pk(r, pr), wr = shuf(r, pr.filter((x) => x[1] !== a)).slice(0, 3).map((x) => x[1]), opts = shuf(r, [a, ...wr]); return { raw: { t: 'choice', q: `¿Para qué sirve ${p}?`, opts, a: opts.indexOf(a), why: '' } }; },
        (r) => { const ev = pk(r, [['click', 'al hacer clic'], ['input', 'cada vez que se escribe en un campo'], ['submit', 'al enviar un formulario'], ['keydown', 'al pulsar una tecla'], ['mouseover', 'al pasar el ratón por encima']]), all = ['al hacer clic', 'cada vez que se escribe en un campo', 'al enviar un formulario', 'al pulsar una tecla', 'al pasar el ratón por encima'], opts = shuf(r, [ev[1], ...shuf(r, all.filter((x) => x !== ev[1])).slice(0, 3)]); return { raw: { t: 'choice', q: `El evento "${ev[0]}" se dispara…`, opts, a: opts.indexOf(ev[1]), why: '' } }; },
        (r) => { const n = ri(r, 2, 4), opts = shuf(r, [String(n), String(n + 1), String(n - 1), '0']); return { raw: { t: 'choice', q: 'Si un <ul> está vacío y ejecutas esto, ¿cuántos <li> tendrá?', code: `for (let i = 0; i < ${n}; i++) {\n  const li = document.createElement("li");\n  ul.append(li);\n}`, opts, a: opts.indexOf(String(n)), why: 'Cada vuelta crea y añade un <li>.' } }; },
      ],
      F: [(r) => ({ q: 'Completa el método para escuchar eventos:', code: `boton.___("click", () => alert("hola"));`, a: ['addEventListener'], out: '' }),
        (r) => ({ q: 'Propiedad para cambiar el texto:', code: `titulo.___ = "${pk(r, WORDS)}";`, a: ['textContent'], out: '' }),
        (r) => ({ q: 'Método para elegir un elemento con un selector CSS:', code: `document.___("#caja");`, a: ['querySelector'], out: '' })],
      C: [TF('El DOM representa la página como un árbol de nodos.', true), TF('addEventListener solo sirve para clics.', false, 'Sirve para cualquier evento.'), C('¿Qué selector CSS apunta a un id?', ['#id', '.id', '@id', '$id'], 0), PR('Relaciona:', [['querySelector', 'Elegir elemento'], ['addEventListener', 'Reaccionar a un evento'], ['createElement', 'Crear nodo'], ['classList', 'Gestionar clases']]), C('¿Qué hace event.preventDefault()?', ['Evita la acción por defecto del evento', 'Cancela el programa', 'Repite el evento', 'Borra el elemento'], 0)] },

    { name: 'Maestría', icon: '👑', color: '#ffd43b', desc: 'recursión, closures, errores y trucos finos', seed: 10,
      tip: 'Un closure es una función que recuerda las variables de donde nació. La recursión es una función que se llama a sí misma con un caso base. try/catch/finally maneja errores. Los valores falsy son false, 0, "", null, undefined y NaN. Cuidado con == y con el orden de ejecución.',
      demo: 'function contador() {\n  let c = 0;\n  return () => ++c;\n}\nconst s = contador();\ns();\nconsole.log(s()); // 2',
      T: [
        (r, t) => { const k = ri(r, 2, 5), n = ri(r, 2, 4); return { code: `function crear(k) {\n  let c = 0;\n  return () => (c += k);\n}\nconst f = crear(${k});\nfor (let i = 1; i < ${n}; i++) f();\nconsole.log(f());`, why: 'El closure conserva c entre llamadas.' }; },
        (r, t) => { const n = ri(r, 4, 9); return { code: `function fib(n) {\n  return n < 2 ? n : fib(n - 1) + fib(n - 2);\n}\nconsole.log(fib(${n}));` }; },
        (r) => { const tp = pk(r, ['null.x', 'undefinedFunc()', 'JSON.parse("{")', 'new Array(-1)']); return { code: `try {\n  ${tp};\n} catch (e) {\n  console.log(e.name);\n} finally {\n  console.log("fin");\n}`, bad: ['TypeError\nfin', 'ReferenceError\nfin', 'SyntaxError\nfin', 'RangeError\nfin'], why: 'finally se ejecuta siempre.' }; },
        (r) => { const l = pk(r, [`[] + {}`, `0.1 + 0.2 === 0.3`, `"b" + "a" + +"a" + "a"`, `[1, 2, 3] + ""`, `typeof NaN`, `null ?? "x"`, `0 || "y"`, `[10, 9, 1].sort().join()`]); return { code: `console.log(${l});`, why: 'Son rarezas famosas de JavaScript: ¡vale la pena conocerlas!' }; },
      ],
      F: [(r) => ({ q: 'Palabra del bloque que maneja el error:', code: `try {\n  null.x;\n} ___ (e) {\n  console.log("error");\n}`, a: ['catch'] }),
        (r) => ({ q: 'Operador que usa el valor de la derecha solo si la izquierda es null o undefined:', code: `console.log(null ___ "${pk(r, WORDS)}");`, a: ['??'] }),
        (r) => ({ q: 'Completa el caso base de la recursión:', code: `function s(n) {\n  if (n ___ 0) return 0;\n  return n + s(n - 1);\n}\nconsole.log(s(${ri(r, 3, 6)}));`, a: ['<=', '==', '==='] })],
      C: [TF('Un closure puede recordar variables de su función externa.', true), TF('NaN === NaN es true.', false, 'NaN no es igual ni a sí mismo.'), C('¿Qué devuelve typeof null?', ['"object"', '"null"', '"undefined"', '"empty"'], 0, 'Es un error histórico de JavaScript.'), PR('Relaciona:', [['try', 'Intenta ejecutar'], ['catch', 'Atrapa el error'], ['finally', 'Se ejecuta siempre'], ['throw', 'Lanza un error']]), C('¿Qué hace falta en toda recursión?', ['Un caso base', 'Un bucle for', 'Una variable global', 'Un objeto'], 0)] },
  ];
  window.NEXUS_JS = track('js', 'JavaScript', JS, jsEval);

  /* =====================================================  C++ / ARDUINO  ===================================================== */
  const cpp = (inc, body) => `${inc ? inc + '\n' : ''}int main() {\n${body.split('\n').map((l) => '  ' + l).join('\n')}\n}`;
  const SIN = '#include <iostream>\nusing namespace std;';
  const prog = (body) => cpp(SIN, body);
  const noEv = () => { throw new Error('C++ requiere out explícito'); };
  const CX = [
    { name: 'Primeros pasos', icon: '🌱', color: '#38d6e8', desc: 'cout, variables, tipos y comentarios', seed: 11,
      tip: 'Todo programa C++ empieza en main(). cout << muestra información (se incluye <iostream>). Los tipos básicos: int (enteros), double (decimales), char (un carácter), bool y string. Los comentarios usan // o /* */, y cada instrucción termina en ;.',
      demo: '#include <iostream>\nusing namespace std;\nint main() {\n  int edad = 15;\n  cout << "Edad: " << edad;\n}',
      T: [
        (r) => { const w = pk(r, WORDS), v = pk(r, WORDS.filter((x) => x !== w)); return { code: prog(pk(r, [`cout << "${w}";`, `cout << "${w}" << " " << "${v}";`])), out: null, _o: (c) => c.match(/"([^"]+)"/g).map((s) => s.slice(1, -1)).join('') }; },
        (r, t) => { const a = N5(r, t, 9, 90), b = N5(r, t, 9, 90); return { code: prog(`int x = ${a};\nx = ${b};\ncout << x;`), out: String(b) }; },
        (r) => { const d = ri(r, 1, 9) + ri(r, 1, 9) / 10; return { code: prog(`double d = ${d.toFixed(1)};\ncout << (int)d;`), out: String(Math.trunc(d)), why: 'La conversión a int descarta los decimales.' }; },
        (r) => { const c = String.fromCharCode(65 + ri(r, 0, 25)); return { code: prog(`char c = '${c}';\ncout << (int)c;`), out: String(c.charCodeAt(0)), why: 'Cada char es un número en la tabla ASCII.' }; },
      ],
      F: [(r) => ({ q: 'Completa para mostrar en pantalla:', code: prog(`___ << "${pk(r, WORDS)}";`), a: ['cout'], out: '' }),
        (r) => ({ q: 'Tipo para números enteros:', code: prog(`___ n = ${ri(r, 2, 99)};`), a: ['int'], out: '' }),
        (r) => ({ q: 'Símbolo con el que termina cada instrucción:', code: prog(`int n = ${ri(r, 2, 99)}___`), a: [';'], out: '' })],
      C: [TF('Todo programa C++ empieza ejecutando main().', true), TF('cout se usa para leer datos del teclado.', false, 'Para leer se usa cin.'), C('¿Qué tipo guarda 3.14?', ['double', 'int', 'char', 'bool'], 0), PR('Relaciona:', [['int', 'Entero'], ['double', 'Decimal'], ['char', 'Un carácter'], ['bool', 'Verdadero o falso']]), C('¿Cómo se escribe un comentario de una línea?', ['// nota', '# nota', '-- nota', '<!-- nota -->'], 0)] },

    { name: 'Operadores', icon: '➕', color: '#19d3ff', desc: 'aritmética, división entera, ++ y comparaciones', seed: 12,
      tip: 'Con enteros, / divide sin decimales (7 / 2 = 3) y % da el resto. x++ usa el valor y luego suma 1; ++x suma primero. Las comparaciones devuelven bool, que cout muestra como 1 o 0.',
      demo: 'cout << 7 / 2;   // 3\ncout << 7 % 2;   // 1\ncout << (7 > 2); // 1',
      T: [
        (r, t) => { const a = N5(r, t, 20, 80), b = ri(r, 2, 9); return { code: prog(`cout << ${a} / ${b};`), out: String(Math.trunc(a / b)), why: 'Entre enteros la división descarta los decimales.' }; },
        (r, t) => { const a = N5(r, t, 20, 80), b = ri(r, 2, 9); return { code: prog(`cout << ${a} % ${b};`), out: String(a % b) }; },
        (r) => { const a = ri(r, 1, 20); const post = r() < 0.5; return { code: prog(post ? `int x = ${a};\ncout << x++ << " " << x;` : `int x = ${a};\ncout << ++x << " " << x;`), out: post ? `${a} ${a + 1}` : `${a + 1} ${a + 1}`, why: 'x++ entrega el valor y luego suma; ++x suma y luego entrega.' }; },
        (r, t) => { const a = N5(r, t, 9, 30), b = N5(r, t, 9, 30); return { code: prog(`cout << (${a} > ${b}) << (${a} == ${b});`), out: `${a > b ? 1 : 0}${a === b ? 1 : 0}`, why: 'Los booleanos se imprimen como 1 (true) o 0 (false).' }; },
      ],
      F: [(r) => ({ q: 'Operador del resto de la división:', code: prog(`cout << ${ri(r, 20, 60)} ___ ${ri(r, 3, 9)};`), a: ['%'], out: '' }),
        (r) => ({ q: 'Operador para sumar 1 a x:', code: prog(`int x = ${ri(r, 1, 9)};\nx___;`), a: ['++'], out: '' }),
        (r) => ({ q: 'Operador de igualdad:', code: prog(`cout << (${ri(r, 1, 5)} ___ ${ri(r, 1, 5)});`), a: ['=='], out: '' })],
      C: [TF('En C++, 7 / 2 con enteros da 3.', true), TF('= compara si dos valores son iguales.', false, '= asigna; == compara.'), C('¿Qué muestra cout << (3 < 5);?', ['1', 'true', '0', 'Error'], 0), PR('Relaciona:', [['%', 'Resto'], ['/', 'División'], ['==', 'Igualdad'], ['!=', 'Distinto']]), C('¿Qué hace x += 5?', ['Suma 5 a x', 'Asigna 5', 'Compara', 'Resta 5'], 0)] },

    { name: 'Decisiones', icon: '🔀', color: '#ffb000', desc: 'if/else, &&, ||, switch y ternario', seed: 13,
      tip: 'if (condición) { } else { } elige entre caminos. && (y), || (o), ! (no) combinan condiciones. switch compara una variable con varios casos y necesita break. El ternario condición ? a : b es un if de una línea.',
      demo: 'int n = 7;\nif (n % 2 == 0) cout << "par";\nelse cout << "impar";',
      T: [
        (r, t) => { const a = N5(r, t, 20, 80); return { code: prog(`int n = ${a};\nif (n % 2 == 0) cout << "par";\nelse cout << "impar";`), out: a % 2 ? 'impar' : 'par' }; },
        (r, t) => { const a = N5(r, t, 30, 70); return { code: prog(`int p = ${a};\nif (p >= 90) cout << "A";\nelse if (p >= 60) cout << "B";\nelse cout << "C";`), out: a >= 90 ? 'A' : a >= 60 ? 'B' : 'C' }; },
        (r, t) => { const a = N5(r, t, 9, 20), b = N5(r, t, 9, 20), c = N5(r, t, 9, 20); const k = ri(r, 0, 2); return { code: prog(['cout << (' + a + ' > ' + b + ' && ' + b + ' > ' + c + ');', 'cout << (' + a + ' > ' + b + ' || ' + b + ' > ' + c + ');', 'cout << !(' + a + ' > ' + b + ');'][k]), out: String([(a > b && b > c), (a > b || b > c), !(a > b)][k] ? 1 : 0) }; },
        (r) => { const d = ri(r, 1, 4); const o = []; for (let i = d; i <= 3; i++) o.push(['', 'uno', 'dos', 'tres'][i]); if (d === 4) o.push('otro'); return { code: prog(`int d = ${d};\nswitch (d) {\n  case 1: cout << "uno"; break;\n  case 2: cout << "dos";\n  case 3: cout << "tres"; break;\n  default: cout << "otro";\n}`), out: d === 1 ? 'uno' : d === 2 ? 'dostres' : d === 3 ? 'tres' : 'otro', why: 'Sin break el caso 2 continúa en el 3.' }; },
      ],
      F: [(r) => ({ q: 'Rama que se ejecuta si la condición falla:', code: prog(`if (${ri(r, 1, 5)} > ${ri(r, 6, 9)}) cout << "a";\n___ cout << "b";`), a: ['else'], out: '' }),
        (r) => ({ q: 'Operador lógico "y":', code: prog(`cout << (${ri(r, 5, 9)} > 3 ___ ${ri(r, 1, 2)} < 3);`), a: ['&&'], out: '' }),
        (r) => ({ q: 'Palabra que cierra cada caso del switch:', code: prog(`switch (1) {\n  case 1: cout << "a"; ___;\n}`), a: ['break'], out: '' })],
      C: [TF('switch necesita break para no continuar al siguiente caso.', true), TF('else if solo puede usarse una vez.', false), C('¿Qué operador es "o" lógico?', ['||', '&&', '!', '|>'], 0), PR('Relaciona:', [['&&', 'Y'], ['||', 'O'], ['!', 'No'], ['? :', 'Ternario']]), C('¿Qué significa if (x)?', ['Se cumple si x no es 0', 'x debe ser 1', 'x es negativo', 'Siempre falso'], 0)] },

    { name: 'Bucles', icon: '🔁', color: '#ff6bcb', desc: 'for, while, do-while, break y continue', seed: 14,
      tip: 'for (int i = 0; i < n; i++) repite n veces. while evalúa antes de cada vuelta y do-while después (siempre corre una vez). break sale; continue salta a la siguiente vuelta.',
      demo: 'int s = 0;\nfor (int i = 1; i <= 4; i++) s += i;\ncout << s; // 10',
      T: [
        (r, t) => { const n = N5(r, t, 4, 14); return { code: prog(`int s = 0;\nfor (int i = 1; i <= ${n}; i++) {\n  s += i;\n}\ncout << s;`), out: String((n * (n + 1)) / 2) }; },
        (r, t) => { const n = N5(r, t, 3, 6), k = ri(r, 2, 3); let x = 1, c = 0; while (x < n * 20) { x *= k; c++; } return { code: prog(`int x = 1, c = 0;\nwhile (x < ${n * 20}) {\n  x *= ${k};\n  c++;\n}\ncout << c;`), out: String(c) }; },
        (r, t) => { const n = N5(r, t, 5, 8), k = ri(r, 2, 4); let o = ''; for (let i = 1; i <= n; i++) { if (i % k === 0) continue; if (i > n - 1) break; o += i; } return { code: prog(`for (int i = 1; i <= ${n}; i++) {\n  if (i % ${k} == 0) continue;\n  if (i > ${n - 1}) break;\n  cout << i;\n}`), out: o, why: 'continue salta la vuelta; break termina el bucle.' }; },
        (r, t) => { const a = ri(r, 2, 4), b = N5(r, t, 2, 3); return { code: prog(`int c = 0;\nfor (int i = 0; i < ${a}; i++)\n  for (int j = 0; j < ${b}; j++)\n    c++;\ncout << c;`), out: String(a * b) }; },
      ],
      F: [(r) => ({ q: 'Palabra clave del bucle:', code: prog(`___ (int i = 0; i < ${ri(r, 3, 6)}; i++) {\n  cout << i;\n}`), a: ['for'], out: '' }),
        (r) => ({ q: 'Completa el bucle que corre al menos una vez:', code: prog(`int i = 0;\ndo {\n  i++;\n} ___ (i < ${ri(r, 2, 5)});`), a: ['while'], out: '' }),
        (r) => ({ q: 'Palabra para salir del bucle:', code: prog(`for (int i = 0; i < 9; i++) {\n  if (i == ${ri(r, 2, 4)}) ___;\n}`), a: ['break'], out: '' })],
      C: [TF('do-while ejecuta el cuerpo al menos una vez.', true), TF('i++ resta uno a i.', false), C('¿Cuántas veces corre for (int i=0;i<5;i++)?', ['5', '4', '6', '0'], 0), PR('Relaciona:', [['for', 'Repeticiones conocidas'], ['while', 'Mientras se cumpla'], ['break', 'Sale del bucle'], ['continue', 'Salta una vuelta']]), C('¿Qué pasa con while (true) sin break?', ['Es un bucle infinito', 'Corre una vez', 'No compila', 'Termina solo'], 0)] },

    { name: 'Arreglos y vectores', icon: '📋', color: '#c586f0', desc: 'arreglos, vector, push_back y recorridos', seed: 15,
      tip: 'Un arreglo tiene tamaño fijo: int a[3] = {1,2,3}; el primer índice es 0. vector<int> (con #include <vector>) crece: push_back() añade, size() cuenta y back() da el último. Un for-each recorre así: for (int x : v).',
      demo: 'vector<int> v = {4, 5};\nv.push_back(6);\ncout << v.size(); // 3',
      T: [
        (r, t) => { const a = Array.from({ length: ri(r, 3, 5) }, () => ri(r, 1, sc(t, 9, 40))), i = ri(r, 0, a.length - 1); return { code: prog(`int a[] = {${a.join(', ')}};\ncout << a[${i}];`), out: String(a[i]) }; },
        (r, t) => { const a = Array.from({ length: 3 }, () => ri(r, 1, sc(t, 9, 30))), v = ri(r, 1, 50); return { code: cpp(SIN + '\n#include <vector>', `vector<int> v = {${a.join(', ')}};\nv.push_back(${v});\ncout << v.size() << " " << v.back();`), out: `${a.length + 1} ${v}` }; },
        (r, t) => { const a = Array.from({ length: ri(r, 4, 6) }, () => ri(r, 1, sc(t, 9, 30))); return { code: prog(`int a[] = {${a.join(', ')}};\nint s = 0;\nfor (int i = 0; i < ${a.length}; i++)\n  if (a[i] % 2 == 0) s += a[i];\ncout << s;`), out: String(a.filter((x) => x % 2 === 0).reduce((p, c) => p + c, 0)) }; },
        (r, t) => { const a = Array.from({ length: ri(r, 4, 6) }, () => ri(r, 1, sc(t, 9, 40))); return { code: cpp(SIN + '\n#include <vector>', `vector<int> v = {${a.join(', ')}};\nint m = v[0];\nfor (int x : v)\n  if (x > m) m = x;\ncout << m;`), out: String(Math.max(...a)) }; },
      ],
      F: [(r) => ({ q: 'Método que añade al final de un vector:', code: cpp(SIN + '\n#include <vector>', `vector<int> v;\nv.___(${ri(r, 1, 9)});`), a: ['push_back'], out: '' }),
        (r) => ({ q: 'Índice del primer elemento:', code: prog(`int a[] = {${ri(r, 1, 9)}, ${ri(r, 10, 19)}};\ncout << a[___];`), a: ['0'], out: '' }),
        (r) => ({ q: 'Método que devuelve el tamaño del vector:', code: cpp(SIN + '\n#include <vector>', `vector<int> v = {1, 2, 3};\ncout << v.___();`), a: ['size'], out: '' })],
      C: [TF('Un arreglo clásico de C++ cambia de tamaño solo.', false, 'Para eso existe vector.'), TF('El primer índice es 0.', true), C('¿Qué librería hace falta para vector?', ['<vector>', '<array.h>', '<list.h>', '<math>'], 0), PR('Relaciona:', [['push_back', 'Añade al final'], ['size', 'Cantidad de elementos'], ['back', 'Último elemento'], ['a[0]', 'Primer elemento']]), C('¿Qué hace for (int x : v)?', ['Recorre todos los elementos de v', 'Borra v', 'Ordena v', 'Copia v'], 0)] },

    { name: 'Funciones', icon: '⚙', color: '#7c9cff', desc: 'parámetros, retorno, referencias y recursión', seed: 16,
      tip: 'Una función se declara con su tipo de retorno: int doble(int x) { return x * 2; }. void no devuelve nada. Los parámetros se copian; con & (referencia) la función modifica el original. Puedes dar valores por defecto y llamar a la función desde sí misma (recursión).',
      demo: 'int doble(int x) { return x * 2; }\nint main() { cout << doble(4); } // 8',
      T: [
        (r, t) => { const k = ri(r, 2, 9), a = N5(r, t, 9, 40); return { code: SIN + `\nint f(int x) {\n  return x * ${k} + 1;\n}\nint main() {\n  cout << f(${a});\n}`, out: String(a * k + 1) }; },
        (r, t) => { const a = N5(r, t, 9, 30), b = ri(r, 1, 9); return { code: SIN + `\nint suma(int a, int b = ${b}) {\n  return a + b;\n}\nint main() {\n  cout << suma(${a});\n}`, out: String(a + b), why: 'Si no pasas b se usa su valor por defecto.' }; },
        (r, t) => { const a = N5(r, t, 9, 30), k = ri(r, 2, 9); return { code: SIN + `\nvoid sube(int &x) {\n  x += ${k};\n}\nint main() {\n  int n = ${a};\n  sube(n);\n  cout << n;\n}`, out: String(a + k), why: 'El & pasa la variable original, no una copia.' }; },
        (r, t) => { const n = ri(r, 3, 6); let f = 1; for (let i = 2; i <= n; i++) f *= i; return { code: SIN + `\nint fact(int n) {\n  return n <= 1 ? 1 : n * fact(n - 1);\n}\nint main() {\n  cout << fact(${n});\n}`, out: String(f) }; },
      ],
      F: [(r) => ({ q: 'Tipo de una función que no devuelve nada:', code: SIN + `\n___ hola() {\n  cout << "${pk(r, WORDS)}";\n}`, a: ['void'], out: '' }),
        (r) => ({ q: 'Palabra para devolver un valor:', code: SIN + `\nint f(int a) {\n  ___ a * 2;\n}`, a: ['return'], out: '' }),
        (r) => ({ q: 'Símbolo para pasar por referencia:', code: SIN + `\nvoid f(int ___x) {\n  x++;\n}`, a: ['&'], out: '' })],
      C: [TF('Una función void puede usar return con valor.', false, 'void no devuelve nada.'), TF('Un parámetro por referencia modifica la variable original.', true), C('¿Dónde se escribe el tipo de retorno?', ['Antes del nombre de la función', 'Después de los paréntesis', 'Dentro de main', 'No se escribe'], 0), PR('Relaciona:', [['void', 'No devuelve nada'], ['int f()', 'Devuelve un entero'], ['&x', 'Referencia'], ['return', 'Devuelve y termina']]), C('¿Qué es la recursión?', ['Una función que se llama a sí misma', 'Un bucle for', 'Una variable global', 'Un tipo de dato'], 0)] },

    { name: 'Cadenas (string)', icon: '🔤', color: '#ff7a59', desc: 'string, length, substr, find y cin', seed: 17,
      tip: 'string (con #include <string>) guarda texto. s.length() da su tamaño, s[0] el primer carácter, s + t los une, s.substr(inicio, cantidad) corta y s.find("x") devuelve la posición (o string::npos). cin >> var lee desde el teclado.',
      demo: 'string s = "hola";\ncout << s.length() << s[0]; // 4h',
      T: [
        (r) => { const w = pk(r, WORDS.filter((x) => x.length > 2)); const k = ri(r, 0, 2); return { code: prog(`string s = "${w}";\ncout << ${['s.length()', 's[0]', 's.substr(1, 2)'][k]};`), out: [String(w.length), w[0], w.substr(1, 2)][k] }; },
        (r) => { const a = pk(r, WORDS), b = pk(r, WORDS.filter((x) => x !== a)); return { code: prog(`string a = "${a}", b = "${b}";\ncout << a + b;`), out: a + b }; },
        (r) => { const w = pk(r, WORDS.filter((x) => x.length > 3)), i = ri(r, 1, w.length - 1); return { code: prog(`string s = "${w}";\ncout << s.find("${w[i]}");`), out: String(w.indexOf(w[i])), why: 'find devuelve la primera posición donde aparece.' }; },
        (r) => { const w = pk(r, WORDS.filter((x) => x.length > 2)); return { code: prog(`string s = "${w}";\nfor (int i = s.length() - 1; i >= 0; i--)\n  cout << s[i];`), out: [...w].reverse().join(''), why: 'Recorre el texto de atrás hacia delante.' }; },
      ],
      F: [(r) => ({ q: 'Método que da el tamaño del texto:', code: prog(`string s = "${pk(r, WORDS)}";\ncout << s.___();`), a: ['length', 'size'], out: '' }),
        (r) => ({ q: 'Objeto para leer del teclado:', code: prog(`int n;\n___ >> n;`), a: ['cin'], out: '' }),
        (r) => ({ q: 'Tipo para guardar texto:', code: prog(`___ s = "${pk(r, WORDS)}";`), a: ['string'], out: '' })],
      C: [TF('s[0] devuelve el primer carácter de s.', true), TF('Las comillas simples \'a\' crean un string.', false, 'Crean un char; los strings usan comillas dobles.'), C('¿Qué hace s.substr(1, 3)?', ['Corta 3 caracteres desde la posición 1', 'Borra 3 caracteres', 'Repite s 3 veces', 'Busca el 3'], 0), PR('Relaciona:', [['cin', 'Leer'], ['cout', 'Mostrar'], ['length()', 'Tamaño'], ['find()', 'Buscar']]), C('¿Con qué se unen dos strings?', ['+', '&', '.', ','], 0)] },

    { name: 'Punteros y referencias', icon: '🎯', color: '#ff3d5a', desc: '&, *, punteros y aritmética básica', seed: 18,
      tip: 'Un puntero guarda la dirección de otra variable. &x es la dirección de x; int* p = &x; y *p accede al valor al que apunta (desreferencia). Una referencia (int& r = x;) es otro nombre para la misma variable. Los nombres de arreglo se comportan como punteros.',
      demo: 'int x = 5;\nint* p = &x;\n*p = 9;\ncout << x; // 9',
      T: [
        (r, t) => { const a = N5(r, t, 9, 60), b = N5(r, t, 9, 60); return { code: prog(`int x = ${a};\nint* p = &x;\n*p = ${b};\ncout << x;`), out: String(b), why: '*p = … cambia la variable a la que apunta p.' }; },
        (r, t) => { const a = N5(r, t, 9, 60), k = ri(r, 2, 9); return { code: prog(`int x = ${a};\nint& r = x;\nr += ${k};\ncout << x;`), out: String(a + k), why: 'r es otro nombre para x.' }; },
        (r, t) => { const a = Array.from({ length: 4 }, () => ri(r, 1, sc(t, 9, 40))), i = ri(r, 0, 3); return { code: prog(`int a[] = {${a.join(', ')}};\nint* p = a;\ncout << *(p + ${i});`), out: String(a[i]), why: 'p + i avanza i posiciones del arreglo.' }; },
        (r, t) => { const a = N5(r, t, 9, 40), b = N5(r, t, 9, 40); return { code: prog(`int a = ${a}, b = ${b};\nint* p = &a;\nint* q = &b;\n*p = *p + *q;\ncout << a << " " << b;`), out: `${a + b} ${b}` }; },
      ],
      F: [(r) => ({ q: 'Operador que obtiene la dirección de x:', code: prog(`int x = ${ri(r, 1, 9)};\nint* p = ___x;`), a: ['&'], out: '' }),
        (r) => ({ q: 'Operador para leer el valor al que apunta p:', code: prog(`int x = ${ri(r, 1, 9)};\nint* p = &x;\ncout << ___p;`), a: ['*'], out: '' }),
        (r) => ({ q: 'Completa la declaración de un puntero a int:', code: prog(`int x = 3;\nint___ p = &x;`), a: ['*', '* '], out: '' })],
      C: [TF('Un puntero guarda la dirección de memoria de otra variable.', true), TF('*p obtiene la dirección de p.', false, '*p es el valor al que apunta; la dirección es &p.'), C('¿Qué es una referencia?', ['Otro nombre para la misma variable', 'Un número aleatorio', 'Una copia de la variable', 'Un tipo de bucle'], 0), PR('Relaciona:', [['&x', 'Dirección de x'], ['*p', 'Valor apuntado'], ['int* p', 'Puntero a int'], ['nullptr', 'Puntero vacío']]), C('¿Qué valor indica "no apunta a nada"?', ['nullptr', 'void', '0.0', 'empty'], 0)] },

    { name: 'Clases y objetos', icon: '🧱', color: '#35f2a0', desc: 'class, struct, constructores y encapsulación', seed: 19,
      tip: 'Una clase agrupa datos y funciones. Los miembros private solo se usan dentro de la clase; public es accesible desde fuera. El constructor se llama al crear el objeto. struct es como class pero sus miembros son públicos por defecto.',
      demo: 'class Perro {\n public:\n  int edad;\n  Perro(int e) { edad = e; }\n};\nPerro p(3);\ncout << p.edad;',
      T: [
        (r, t) => { const a = N5(r, t, 9, 40), k = ri(r, 2, 5); return { code: SIN + `\nclass C {\n public:\n  int v;\n  C(int x) { v = x; }\n  int mult() { return v * ${k}; }\n};\nint main() {\n  C c(${a});\n  cout << c.mult();\n}`, out: String(a * k) }; },
        (r, t) => { const a = N5(r, t, 9, 40), b = N5(r, t, 9, 40); return { code: SIN + `\nstruct P {\n  int x, y;\n};\nint main() {\n  P p = {${a}, ${b}};\n  p.x += p.y;\n  cout << p.x;\n}`, out: String(a + b) }; },
        (r, t) => { const a = N5(r, t, 9, 30), k = ri(r, 1, 9); return { code: SIN + `\nclass Cuenta {\n  int saldo;\n public:\n  Cuenta(int s) { saldo = s; }\n  void deposita(int m) { saldo += m; }\n  int ver() { return saldo; }\n};\nint main() {\n  Cuenta c(${a});\n  c.deposita(${k});\n  cout << c.ver();\n}`, out: String(a + k), why: 'saldo es privado: se modifica solo con métodos públicos.' }; },
        (r) => { const n = ri(r, 2, 4); return { code: SIN + `\nclass Cont {\n public:\n  static int total;\n  Cont() { total++; }\n};\nint Cont::total = 0;\nint main() {\n${Array.from({ length: n }, (_, i) => '  Cont c' + i + ';').join('\n')}\n  cout << Cont::total;\n}`, out: String(n), why: 'static es compartido por todos los objetos.' }; },
      ],
      F: [(r) => ({ q: 'Palabra clave para declarar una clase:', code: SIN + `\n___ Perro {\n public:\n  int edad;\n};`, a: ['class'], out: '' }),
        (r) => ({ q: 'Zona de la clase accesible desde fuera:', code: SIN + `\nclass A {\n ___:\n  int x;\n};`, a: ['public'], out: '' }),
        (r) => ({ q: 'El constructor se llama igual que…', code: SIN + `\nclass Coche {\n public:\n  ___() { }\n};`, a: ['Coche'], out: '' })],
      C: [TF('Un miembro private no se puede usar fuera de la clase.', true), TF('Un constructor tiene tipo de retorno int.', false, 'Los constructores no devuelven nada.'), C('¿Qué es un objeto?', ['Una instancia de una clase', 'Una función', 'Un tipo primitivo', 'Un comentario'], 0), PR('Relaciona:', [['class', 'Plantilla de objetos'], ['private', 'Solo dentro de la clase'], ['public', 'Accesible desde fuera'], ['constructor', 'Se ejecuta al crear el objeto']]), C('¿Qué operador accede a un miembro de un objeto?', ['.', '::>', '->>', '#'], 0)] },

    { name: 'Arduino', icon: '🤖', color: '#00c4a7', desc: 'setup, loop, pines, sensores y servos', seed: 20,
      tip: 'Un sketch de Arduino tiene setup() (corre una vez) y loop() (se repite para siempre). pinMode(pin, OUTPUT|INPUT) configura un pin, digitalWrite(pin, HIGH|LOW) lo enciende o apaga, digitalRead lee un botón y analogRead (0–1023) lee un sensor. delay(ms) pausa en milisegundos.',
      demo: 'void setup() {\n  pinMode(13, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(500);\n  digitalWrite(13, LOW);\n  delay(500);\n}',
      T: [
        (r) => { const ms = pk(r, [250, 500, 1000, 2000]), want = ms / 1000; const opts = shuf(r, [`${want} s`, `${want * 10} s`, `${want / 10} s`, `${ms} s`]); return { raw: { t: 'choice', q: `¿Cuánto tiempo pausa delay(${ms})?`, opts, a: opts.indexOf(`${want} s`), why: 'delay recibe milisegundos: 1000 ms = 1 s.' } }; },
        (r) => { const pin = ri(r, 2, 13), on = r() < 0.5; const a = on ? 'Enciende el pin (5 V)' : 'Apaga el pin (0 V)'; const opts = shuf(r, [a, on ? 'Apaga el pin (0 V)' : 'Enciende el pin (5 V)', 'Lee el valor del pin', 'Configura el pin como entrada']); return { raw: { t: 'choice', q: '¿Qué hace esta línea?', code: `digitalWrite(${pin}, ${on ? 'HIGH' : 'LOW'});`, opts, a: opts.indexOf(a), why: '' } }; },
        (r) => { const v = pk(r, [0, 256, 512, 768, 1023]), volt = ((v / 1023) * 5).toFixed(1); const opts = shuf(r, [volt + ' V', ((v / 1023) * 3.3).toFixed(1) + ' V', (5 - (v / 1023) * 5).toFixed(1) + ' V', v + ' V']).filter((x, i, a) => a.indexOf(x) === i); if (opts.length < 3) opts.push('2.2 V', '4.4 V'); return { raw: { t: 'choice', q: `Con alimentación de 5 V, analogRead devuelve ${v}. ¿Qué voltaje es aproximadamente?`, opts, a: opts.indexOf(volt + ' V'), why: 'voltaje = lectura / 1023 × 5.' } }; },
        (r) => { const f = pk(r, [['setup()', 'Se ejecuta una sola vez al inicio'], ['loop()', 'Se repite continuamente'], ['pinMode()', 'Define si un pin es entrada o salida'], ['Serial.begin(9600)', 'Inicia la comunicación serial'], ['analogWrite()', 'Entrega una señal PWM (0–255)'], ['millis()', 'Milisegundos desde que arrancó la placa']]), all = ['Se ejecuta una sola vez al inicio', 'Se repite continuamente', 'Define si un pin es entrada o salida', 'Inicia la comunicación serial', 'Entrega una señal PWM (0–255)', 'Milisegundos desde que arrancó la placa'], opts = shuf(r, [f[1], ...shuf(r, all.filter((x) => x !== f[1])).slice(0, 3)]); return { raw: { t: 'choice', q: `¿Qué hace ${f[0]}?`, opts, a: opts.indexOf(f[1]), why: '' } }; },
      ],
      F: [(r) => ({ q: 'Configura el pin como salida:', code: `void setup() {\n  ___(${ri(r, 2, 13)}, OUTPUT);\n}`, a: ['pinMode'], out: '' }),
        (r) => ({ q: 'Enciende el pin:', code: `digitalWrite(${ri(r, 2, 13)}, ___);`, a: ['HIGH'], out: '' }),
        (r) => ({ q: 'Pausa de un segundo:', code: `___(1000);`, a: ['delay'], out: '' })],
      C: [TF('loop() se ejecuta una sola vez.', false, 'Se repite indefinidamente.'), TF('analogRead devuelve valores de 0 a 1023.', true), C('¿Qué función inicia el puerto serie?', ['Serial.begin()', 'Serial.start()', 'port.open()', 'Serial.on()'], 0), PR('Relaciona:', [['OUTPUT', 'Pin de salida'], ['INPUT', 'Pin de entrada'], ['HIGH', '5 V'], ['LOW', '0 V']]), C('¿Qué librería controla servomotores?', ['Servo.h', 'Motor.h', 'Arduino.h', 'Wire.h'], 0)] },
  ];
  // plantillas con 'out' calculado en la propia plantilla; la de «Primeros pasos» deriva la salida del código
  const cppFix = (s) => s.T.map((f) => (r, t) => { const x = f(r, t); if (x._o) x.out = x._o(x.code); return x; });
  CX.forEach((s) => { s.T = cppFix(s); });
  window.NEXUS_CPP = track('cpp', 'C++ / Arduino', CX, noEv);
  window.NEXUS_TRACKS_READY = true;
})();
