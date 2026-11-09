/* NEXUS Academia — Ruta de 10 etapas × 50 niveles (500 niveles) con dificultad creciente.
   Los ejercicios se GENERAN con una semilla por nivel (siempre iguales para el mismo nivel, distintos entre niveles) y sus
   respuestas se calculan con código; el script de verificación las contrasta ejecutando el Python real.
   Cada nivel = 5 ejercicios: traza de código, completar, concepto, y dos trazas más. */
(function () {
  const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1)), pk = (r, a) => a[Math.floor(r() * a.length)];
  const shuf = (r, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const WORDS = ['sol', 'luna', 'gato', 'casa', 'mesa', 'río', 'pan', 'nube', 'flor', 'mar', 'tren', 'lago', 'pino', 'faro', 'roca'];
  const ASCII = WORDS.filter((w) => /^[a-z]+$/.test(w));
  const LEN_WORDS = ['a', 'sol', 'luna', 'nubes', 'tigres', 'planeta'];
  const NAMES = ['Ana', 'Luis', 'Eva', 'Leo', 'Zoe', 'Max'];
  const fl = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(x));
  const pe = (v) => (typeof v === 'string' ? `'${v}'` : v === true ? 'True' : v === false ? 'False' : String(v));
  const pl = (a) => '[' + a.map(pe).join(', ') + ']';
  const pd = (pairs) => '{' + pairs.map(([k, v]) => `${pe(k)}: ${pe(v)}`).join(', ') + '}';
  const arr = (r, t, n, uniq) => { const out = []; const hi = 9 + Math.floor(t * 40); while (out.length < n) { const v = ri(r, 1, hi); if (!uniq || !out.includes(v)) out.push(v); } return out; };
  const ERRS = ['IndexError', 'KeyError', 'ValueError', 'TypeError', 'ZeroDivisionError', 'NameError'];
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const fibn = (n) => { let a = 0, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a; };
  const fact = (n) => { let x = 1; for (let i = 2; i <= n; i++) x *= i; return x; };

  /* respuestas incorrectas verosímiles */
  function wrongs(ans, r) {
    const out = new Set(), add = (x) => { x = String(x); if (x !== ans && x.length) out.add(x); };
    if (/^-?\d+$/.test(ans)) { const n = +ans; [n + 1, n - 1, n + 2, n - 2, n * 2, n + 10, n - 10, Math.floor(n / 2), n + 3].forEach(add); }
    else if (/^-?\d+\.\d+$/.test(ans)) { const n = +ans; [n + 1, n - 1, n * 2, Math.round(n), n + 0.5].forEach((x) => add(fl(+x.toFixed(2)))); }
    else if (ans === 'True' || ans === 'False') { add(ans === 'True' ? 'False' : 'True'); add('None'); add('Error'); }
    else {
      const nums = ans.match(/-?\d+/g);
      if (nums) nums.forEach((_, i) => [1, -1, 2].forEach((dv) => { let k = 0; add(ans.replace(/-?\d+/g, (x) => (k++ === i ? String(+x + dv) : x))); }));
      if (ans.startsWith('[') && ans.endsWith(']')) { const els = ans.slice(1, -1).split(', '); if (els.length > 1) { add('[' + els.slice().reverse().join(', ') + ']'); add('[' + els.slice(0, -1).join(', ') + ']'); add('[' + els.slice(1).join(', ') + ']'); add('[' + els.slice().sort().join(', ') + ']'); } }
      add([...ans].reverse().join('')); add(ans.toUpperCase()); add(ans.slice(0, -1)); add(ans.slice(1)); add(ans + 's');
    }
    const a = shuf(r, [...out]); let i = 0; while (a.length < 3) a.push(ans + '!'.repeat(++i));
    return a.slice(0, 3);
  }
  const choice = (r, o) => {
    const opts = o.err ? shuf(r, [o.out, ...shuf(r, ERRS.filter((x) => x !== o.out)).slice(0, 3)]) : shuf(r, [o.out, ...wrongs(o.out, r)]);
    return { t: 'choice', q: o.err ? '¿Qué error lanza este código?' : o.q || '¿Qué muestra este código?', code: o.code, opts, a: opts.indexOf(o.out), why: o.why || '', chk: { code: o.code, out: o.out, err: !!o.err } };
  };
  const fill = (o) => ({ t: 'fill', q: o.q, code: o.code, a: o.a, why: o.why || '', chk: { code: o.code.replace('___', o.a[0]), out: o.out } });
  const C = (q, opts, a, why) => ({ t: 'choice', q, opts, a, why: why || '' }), TF = (q, a, why) => ({ t: 'tf', q, a, why: why || '' }), OR = (q, lines, why) => ({ t: 'order', q, lines, why: why || '' }), PR = (q, pairs) => ({ t: 'pairs', q, pairs, why: '' });
  const sc = (t, base, span) => base + Math.floor(t * span);   // escala un número con la dificultad

  const STAGES = [
    { name: 'Primeros pasos', icon: '🌱', color: '#35f2a0', desc: 'print, variables, tipos y comentarios',
      tip: 'print() muestra información; las variables guardan valores; type() dice el tipo (int, float, str, bool); lo que sigue a # es un comentario.', demo: 'edad = 15\nprint(type(edad))  # <class \'int\'>',
      T: [
        (r, t) => { const w = pk(r, WORDS), v = pk(r, WORDS.filter((x) => x !== w)); if (t < 0.34) return { code: `print("${w}")`, out: w }; if (t < 0.67) return { code: `print("${w}" + "${v}")`, out: w + v, why: '+ une textos sin espacio.' }; return { code: `print("${w}", "${v}")`, out: `${w} ${v}`, why: 'print separa los valores con un espacio.' }; },
        (r, t) => { const a = ri(r, 1, sc(t, 9, 90)), b = ri(r, 1, sc(t, 9, 90)), n = pk(r, ['x', 'edad', 'n', 'total', 'puntos']); return t < 0.5 ? { code: `${n} = ${a}\nprint(${n})`, out: String(a) } : { code: `${n} = ${a}\n${n} = ${b}\nprint(${n})`, out: String(b), why: 'La variable guarda el último valor asignado.' }; },
        (r) => { const [l, tp] = pk(r, [[String(ri(r, 1, 99)), 'int'], [`${ri(r, 1, 9)}.${ri(r, 1, 9)}`, 'float'], [`"${pk(r, WORDS)}"`, 'str'], [pk(r, ['True', 'False']), 'bool']]); return { code: `print(type(${l}))`, out: `<class '${tp}'>`, why: 'type() devuelve la clase del valor.' }; },
        (r) => ({ code: `# esto es una nota\nprint("${pk(r, WORDS)}")  # otra nota\n# print("no")`, out: '', why: '' }),
      ],
      F: [
        (r) => { const w = pk(r, WORDS); return { q: `Completa para mostrar «${w}»:`, code: `___("${w}")`, a: ['print'], out: w }; },
        (r) => { const n = pk(r, ['edad', 'n', 'total', 'puntos']), a = ri(r, 2, 99); return { q: 'Escribe el nombre de la variable para mostrar su valor:', code: `${n} = ${a}\nprint(___)`, a: [n], out: String(a) }; },
        (r) => { const w = pk(r, WORDS); return { q: 'Completa el símbolo de comentario (Python lo ignora):', code: `___ nota\nprint("${w}")`, a: ['#'], out: w }; },
      ],
      C: [TF('En Python un texto debe ir entre comillas.', true), TF('5 y "5" son del mismo tipo.', false, '5 es int y "5" es str.'), C('¿Cuál de estos es un número decimal?', ['3.5', '"3.5"', 'True', '[3.5]'], 0), PR('Relaciona:', [['#', 'Comentario'], ['print()', 'Muestra texto'], ['"texto"', 'Cadena (str)'], ['=', 'Asigna un valor']]), OR('Ordena el programa:', ['# saludo', 'nombre = "Ana"', 'print(nombre)']), TF('print() sirve para mostrar información en pantalla.', true)] },

    { name: 'Operaciones y textos', icon: '➕', color: '#19d3ff', desc: 'aritmética, precedencia y métodos de texto',
      tip: 'Los operadores: + - * / // (entera) % (resto) ** (potencia). La multiplicación va antes que la suma; los paréntesis se resuelven primero. Los textos se pueden unir (+) y repetir (*).', demo: 'print(2 + 3 * 4)    # 14\nprint(17 // 5, 17 % 5)  # 3 2',
      T: [
        (r, t) => { const m = sc(t, 9, 60), a = ri(r, 2, m), b = ri(r, 2, m), c = ri(r, 2, 12); if (t < 0.3) { const op = pk(r, ['+', '-', '*']); return { code: `print(${a} ${op} ${b})`, out: String({ '+': a + b, '-': a - b, '*': a * b }[op]) }; } if (t < 0.65) return { code: `print(${a} + ${b} * ${c})`, out: String(a + b * c), why: 'La multiplicación se hace antes que la suma.' }; return { code: `print((${a} + ${b}) * ${c})`, out: String((a + b) * c), why: 'Los paréntesis se resuelven primero.' }; },
        (r, t) => { const b = ri(r, 2, 9), a = ri(r, b, sc(t, 20, 200)); return r() < 0.5 ? { code: `print(${a} // ${b})`, out: String(Math.floor(a / b)), why: '// es la división entera.' } : { code: `print(${a} % ${b})`, out: String(a % b), why: '% devuelve el resto.' }; },
        (r, t) => { const a = ri(r, 2, sc(t, 5, 4)), b = ri(r, 2, sc(t, 3, 3)); return { code: `print(${a} ** ${b})`, out: String(a ** b), why: '** es la potencia.' }; },
        (r) => { const w = pk(r, WORDS), k = ri(r, 2, 4), c = Math.floor(r() * 5); if (c === 0) return { code: `s = "${w}"\nprint(s * ${k})`, out: w.repeat(k) }; if (c === 1) return { code: `print(len("${w}") + ${k})`, out: String(w.length + k) }; if (c === 2) return { code: `print("${w}".upper())`, out: w.toUpperCase() }; if (c === 3) { const i = ri(r, 0, w.length - 1); return { code: `print("${w}"[${i}])`, out: w[i], why: 'Los índices empiezan en 0.' }; } const v = pk(r, WORDS); return { code: `print("${w}" + " " + "${v}")`, out: `${w} ${v}` }; },
        (r) => { const b = pk(r, [2, 4, 5, 10]), a = ri(r, 1, 30); return { code: `print(${a} / ${b})`, out: fl(a / b), why: '/ siempre devuelve un decimal (float).' }; },
      ],
      F: [
        (r, t) => { let a, b, v; do { a = ri(r, 2, sc(t, 9, 20)); b = ri(r, 2, sc(t, 9, 20)); v = [a + b, a - b, a * b]; } while (new Set(v).size < 3); const k = Math.floor(r() * 3); return { q: `Elige el operador para obtener ${v[k]}:`, code: `print(${a} ___ ${b})`, a: ['+-*'[k]], out: String(v[k]) }; },
        (r) => { const w = pk(r, WORDS); return { q: 'Completa el método que pasa a mayúsculas:', code: `print("${w}".___())`, a: ['upper'], out: w.toUpperCase() }; },
        (r, t) => { let b, q, m, a, v; do { b = ri(r, 3, 9); q = ri(r, 2, sc(t, 9, 30)); m = ri(r, 1, b - 1); a = b * q + m; v = [a + b, a - b, a * b, q, m]; } while (new Set(v).size < 5); return { q: `¿Qué operador da el resto de ${a} entre ${b}?`, code: `print(${a} ___ ${b})`, a: ['%'], out: String(m) }; },
      ],
      C: [TF('2 + 3 * 4 es igual a 20.', false, 'Es 14: primero se multiplica.'), TF('"ab" * 3 da "ababab".', true), C('¿Qué operador devuelve el resto de una división?', ['%', '//', '**', '/'], 0), PR('Relaciona:', [['+', 'Sumar o unir textos'], ['//', 'División entera'], ['%', 'Resto'], ['**', 'Potencia']]), C('¿Qué tipo devuelve 8 / 2?', ['float', 'int', 'str', 'bool'], 0, '/ siempre devuelve float: 4.0'), TF('len("hola") devuelve 4.', true)] },

    { name: 'Decisiones', icon: '🔀', color: '#ffb000', desc: 'if, elif, else, and, or, not',
      tip: 'if ejecuta un bloque si la condición es verdadera; elif prueba otra y else cubre el resto. and/or combinan condiciones y not las invierte. El bloque va indentado.', demo: 'n = 7\nif n > 5:\n    print("grande")\nelse:\n    print("pequeño")',
      T: [
        (r, t) => { const a = ri(r, 0, sc(t, 10, 90)), b = ri(r, 0, sc(t, 10, 90)), op = pk(r, ['>', '<', '>=', '<=', '==', '!=']), w1 = pk(r, WORDS), w2 = pk(r, WORDS.filter((x) => x !== w1)); const ok = { '>': a > b, '<': a < b, '>=': a >= b, '<=': a <= b, '==': a === b, '!=': a !== b }[op]; return { code: `n = ${a}\nif n ${op} ${b}:\n    print("${w1}")\nelse:\n    print("${w2}")`, out: ok ? w1 : w2 }; },
        (r) => { const t1 = ri(r, 10, 40), t2 = t1 + ri(r, 10, 40), a = ri(r, 0, t2 + 30); return { code: `n = ${a}\nif n < ${t1}:\n    print("bajo")\nelif n < ${t2}:\n    print("medio")\nelse:\n    print("alto")`, out: a < t1 ? 'bajo' : a < t2 ? 'medio' : 'alto', why: 'Se ejecuta el primer bloque cuya condición es verdadera.' }; },
        (r) => { const x = ri(r, 0, 20), y = ri(r, 0, 20), p = ri(r, 0, 20), q = ri(r, 0, 20), op = pk(r, ['and', 'or']), A = x > p, B = y < q; return { code: `a = ${x}\nb = ${y}\nprint(a > ${p} ${op} b < ${q})`, out: (op === 'and' ? A && B : A || B) ? 'True' : 'False', why: 'and exige las dos condiciones; or basta con una.' }; },
        (r) => { const a = ri(r, 0, 30), b = ri(r, 0, 30); return { code: `print(not (${a} > ${b}))`, out: !(a > b) ? 'True' : 'False', why: 'not invierte el resultado.' }; },
        (r, t) => { const a = ri(r, 1, sc(t, 99, 9000)); return { code: `n = ${a}\nif n % 2 == 0:\n    print("par")\nelse:\n    print("impar")`, out: a % 2 === 0 ? 'par' : 'impar' }; },
        (r) => { const x = ri(r, 0, 30), y = ri(r, 0, 30); return { code: `x = ${x}\ny = ${y}\nif x > 10:\n    if y > 10:\n        print("A")\n    else:\n        print("B")\nelse:\n    print("C")`, out: x > 10 ? (y > 10 ? 'A' : 'B') : 'C', why: 'El if interior solo se evalúa si el exterior es verdadero.' }; },
      ],
      F: [
        (r, t) => { const v = ri(r, 1, sc(t, 20, 80)); return { q: 'Completa la comparación de igualdad:', code: `x = ${v}\nif x ___ ${v}:\n    print("igual")`, a: ['=='], out: 'igual', why: '== compara; = asigna.' }; },
        (r) => { const a = ri(r, 5, 9); return { q: 'Completa la palabra que encadena otra condición:', code: `n = ${a}\nif n < 5:\n    print("A")\n___ n < 10:\n    print("B")\nelse:\n    print("C")`, a: ['elif'], out: 'B' }; },
        () => ({ q: 'Completa para que muestre False:', code: 'print(not ___)', a: ['True'], out: 'False' }),
      ],
      C: [TF('= compara dos valores.', false, '== compara; = asigna.'), TF('elif se evalúa solo si el if anterior fue falso.', true), C('¿Qué hace "and"?', ['Exige que ambas condiciones sean verdaderas', 'Basta con que una sea verdadera', 'Invierte la condición', 'Compara textos'], 0), PR('Relaciona:', [['==', 'Igual a'], ['!=', 'Distinto de'], ['>=', 'Mayor o igual'], ['not', 'Niega una condición']]), OR('Ordena el programa:', ['edad = 18', 'if edad >= 18:', '    print("Adulto")']), TF('Python usa llaves { } para delimitar el bloque de un if.', false, 'Usa la indentación.')] },

    { name: 'Bucles', icon: '🔁', color: '#ff6bcb', desc: 'for, while, range, break y continue',
      tip: 'for recorre una secuencia; range(n) genera 0…n-1, range(a, b) va de a a b-1 y range(a, b, paso) salta de paso en paso. while repite mientras su condición sea verdadera; break sale y continue salta a la siguiente vuelta.', demo: 'total = 0\nfor i in range(4):\n    total += i\nprint(total)  # 6',
      T: [
        (r, t) => { const n = ri(r, 3, sc(t, 6, 30)), m = Math.floor(r() * 3); if (m === 0) return { code: `total = 0\nfor i in range(${n}):\n    total += i\nprint(total)`, out: String(n * (n - 1) / 2) }; if (m === 1) { const a = ri(r, 1, 5), b = a + ri(r, 3, sc(t, 6, 20)); let s = 0; for (let i = a; i < b; i++) s += i; return { code: `total = 0\nfor i in range(${a}, ${b}):\n    total += i\nprint(total)`, out: String(s), why: 'range(a, b) va de a hasta b-1.' }; } const st = ri(r, 2, 3), n2 = ri(r, 6, sc(t, 12, 30)); let s = 0; for (let i = 0; i < n2; i += st) s += i; return { code: `total = 0\nfor i in range(0, ${n2}, ${st}):\n    total += i\nprint(total)`, out: String(s), why: 'El tercer valor de range es el paso.' }; },
        (r, t) => { const a = ri(r, 5, sc(t, 20, 60)), s = ri(r, 2, 4); let n = a, c = 0; while (n > 0) { n -= s; c++; } return { code: `n = ${a}\ncount = 0\nwhile n > 0:\n    n -= ${s}\n    count += 1\nprint(count)`, out: String(c) }; },
        (r) => { const w = pk(r, WORDS) + pk(r, WORDS).slice(0, 2); if (r() < 0.5) return { code: `s = ""\nfor ch in "${w}":\n    s = ch + s\nprint(s)`, out: [...w].reverse().join(''), why: 'Cada letra se coloca delante de las anteriores.' }; let c = 0; for (const ch of w) if ('aeiou'.includes(ch)) c++; return { code: `count = 0\nfor ch in "${w}":\n    if ch in "aeiou":\n        count += 1\nprint(count)`, out: String(c) }; },
        (r, t) => { const n = ri(r, 5, sc(t, 12, 20)), k = ri(r, 2, n - 2); let last = 0; for (let i = 0; i < n; i++) { if (i === k) break; last = i; } return { code: `last = 0\nfor i in range(${n}):\n    if i == ${k}:\n        break\n    last = i\nprint(last)`, out: String(last), why: `break termina el bucle al llegar a ${k}.` }; },
        (r, t) => { const n = ri(r, 3, sc(t, 6, 4)), res = []; for (let i = 1; i < n; i++) res.push(i * i); return { code: `res = []\nfor i in range(1, ${n}):\n    res.append(i * i)\nprint(res)`, out: pl(res) }; },
        (r, t) => { const n = ri(r, 6, sc(t, 15, 30)), k = ri(r, 2, 4); let s = 0; for (let i = 1; i <= n; i++) { if (i % k === 0) continue; s += i; } return { code: `total = 0\nfor i in range(1, ${n + 1}):\n    if i % ${k} == 0:\n        continue\n    total += i\nprint(total)`, out: String(s), why: 'continue salta a la siguiente vuelta.' }; },
      ],
      F: [
        (r, t) => { const n = ri(r, 3, sc(t, 8, 12)); let s = 0; for (let i = 0; i < n; i++) s += i; return { q: 'Completa la función que genera la secuencia:', code: `total = 0\nfor i in ___(${n}):\n    total += i\nprint(total)`, a: ['range'], out: String(s) }; },
        () => ({ q: 'Completa la condición para que cuente hasta cero:', code: 'n = 5\nwhile n ___ 0:\n    n -= 1\nprint(n)', a: ['>'], out: '0' }),
        (r, t) => { const n = ri(r, 3, sc(t, 8, 12)); let s = 0; for (let i = 0; i < n; i++) s += i; return { q: 'Completa el operador que acumula:', code: `total = 0\nfor i in range(${n}):\n    total ___ i\nprint(total)`, a: ['+='], out: String(s) }; },
      ],
      C: [TF('range(3) genera 0, 1 y 2.', true), TF('Un bucle while puede no ejecutarse nunca.', true), C('¿Qué hace continue?', ['Salta a la siguiente vuelta', 'Termina el bucle', 'Reinicia el programa', 'Detiene Python'], 0), PR('Relaciona:', [['for', 'Recorre una secuencia'], ['while', 'Repite mientras sea verdadero'], ['break', 'Sale del bucle'], ['range()', 'Genera números']]), OR('Ordena la cuenta regresiva:', ['n = 3', 'while n > 0:', '    print(n)', '    n -= 1']), TF('range(1, 5) incluye el 5.', false, 'Termina en el 4.')] },

    { name: 'Listas', icon: '📋', color: '#c586f0', desc: 'índices, cortes, métodos y comprensiones',
      tip: 'Una lista guarda varios valores; el primer índice es 0 y -1 es el último. lista[a:b] corta sin incluir b. Métodos: append, pop, index, count; funciones: len, sum, max, min, sorted. Una comprensión crea una lista nueva: [x * 2 for x in lista].', demo: 'nums = [4, 8, 15]\nprint(nums[-1], len(nums))  # 15 3',
      T: [
        (r, t) => { const a = arr(r, t, ri(r, 4, sc(t, 6, 3))), i = ri(r, -a.length, a.length - 1); return { code: `nums = ${pl(a)}\nprint(nums[${i}])`, out: String(a[i < 0 ? a.length + i : i]), why: i < 0 ? 'Los índices negativos cuentan desde el final.' : 'Los índices empiezan en 0.' }; },
        (r, t) => { const a = arr(r, t, ri(r, 5, 8)), i = ri(r, 0, 2), j = ri(r, i + 1, a.length - 1); return { code: `nums = ${pl(a)}\nprint(nums[${i}:${j}])`, out: pl(a.slice(i, j)), why: 'El corte [i:j] excluye la posición j.' }; },
        (r, t) => { const a = arr(r, t, ri(r, 4, 7)), f = pk(r, ['sum', 'max', 'min', 'len']); return { code: `nums = ${pl(a)}\nprint(${f}(nums))`, out: String({ sum: a.reduce((x, y) => x + y, 0), max: Math.max(...a), min: Math.min(...a), len: a.length }[f]) }; },
        (r, t) => { const a = arr(r, t, ri(r, 3, 5)), x = ri(r, 1, 20); return r() < 0.5 ? { code: `nums = ${pl(a)}\nnums.append(${x})\nprint(nums)`, out: pl([...a, x]) } : { code: `nums = ${pl(a)}\nprint(nums.pop())`, out: String(a[a.length - 1]), why: 'pop() quita y devuelve el último elemento.' }; },
        (r, t) => { const a = arr(r, t, ri(r, 4, 6)); return r() < 0.5 ? { code: `nums = ${pl(a)}\nprint(sorted(nums))`, out: pl([...a].sort((x, y) => x - y)) } : { code: `nums = ${pl(a)}\nprint(nums[::-1])`, out: pl([...a].reverse()), why: '[::-1] invierte la lista.' }; },
        (r, t) => { const a = arr(r, t, ri(r, 4, 7)), k = ri(r, 2, 4); return r() < 0.5 ? { code: `nums = ${pl(a)}\nprint([x * ${k} for x in nums])`, out: pl(a.map((x) => x * k)), why: 'Una comprensión crea una lista nueva.' } : { code: `nums = ${pl(a)}\nprint([x for x in nums if x % 2 == 0])`, out: pl(a.filter((x) => x % 2 === 0)), why: 'La condición filtra los elementos.' }; },
        (r, t) => { const a = arr(r, t, 6), v = pk(r, a); return r() < 0.5 ? { code: `nums = ${pl(a)}\nprint(nums.index(${v}))`, out: String(a.indexOf(v)), why: 'index devuelve la primera posición.' } : { code: `nums = ${pl(a)}\nprint(nums.count(${v}))`, out: String(a.filter((x) => x === v).length) }; },
      ],
      F: [
        (r, t) => { const a = arr(r, t, ri(r, 3, 5)), x = ri(r, 1, 20); return { q: 'Completa el método que añade al final:', code: `nums = ${pl(a)}\nnums.___(${x})\nprint(len(nums))`, a: ['append'], out: String(a.length + 1) }; },
        (r, t) => { const a = arr(r, t, 5, true), i = ri(r, 0, 4); return { q: `Escribe el índice para mostrar ${a[i]}:`, code: `nums = ${pl(a)}\nprint(nums[___])`, a: [String(i)], out: String(a[i]) }; },
        (r, t) => { const a = arr(r, t, ri(r, 3, 6)); return { q: 'Completa la función que cuenta los elementos:', code: `nums = ${pl(a)}\nprint(___(nums))`, a: ['len'], out: String(a.length) }; },
      ],
      C: [TF('El primer elemento de una lista tiene el índice 0.', true), TF('append() añade el elemento al principio.', false, 'Lo añade al final.'), C('¿Qué devuelve len([4, 8, 15])?', ['3', '4', '15', '2'], 0), PR('Relaciona:', [['append()', 'Añade al final'], ['len()', 'Cuenta elementos'], ['sorted()', 'Ordena sin cambiar la original'], ['[::-1]', 'Invierte']]), OR('Ordena el programa:', ['nums = [3, 1, 2]', 'nums.append(5)', 'print(len(nums))']), TF('nums[-1] es el último elemento.', true)] },

    { name: 'Funciones', icon: '⚙', color: '#7c9cff', desc: 'def, return, parámetros y ámbito',
      tip: 'def define una función; return devuelve un valor (sin return, devuelve None). Los parámetros pueden tener valor por defecto y se pueden pasar por nombre. Las variables creadas dentro de una función son locales.', demo: 'def doble(x):\n    return x * 2\n\nprint(doble(4))  # 8',
      T: [
        (r, t) => { const k = ri(r, 2, sc(t, 5, 5)), c = ri(r, 0, sc(t, 9, 20)), a = ri(r, 1, sc(t, 9, 10)); return { code: `def f(x):\n    return x * ${k} + ${c}\n\nprint(f(${a}))`, out: String(a * k + c) }; },
        (r) => { const d = ri(r, 1, 9), a = ri(r, 1, 20); return { code: `def suma(a, b=${d}):\n    return a + b\n\nprint(suma(${a}))`, out: String(a + d), why: 'Si no pasas b, usa su valor por defecto.' }; },
        (r) => { const a = ri(r, 10, 40), b = ri(r, 1, 9); return { code: `def resta(a, b):\n    return a - b\n\nprint(resta(b=${b}, a=${a}))`, out: String(a - b), why: 'Con argumentos por nombre el orden no importa.' }; },
        (r) => { const x = ri(r, 1, 9), y = ri(r, 10, 19); return { code: `x = ${x}\n\ndef cambia():\n    x = ${y}\n    return x\n\ncambia()\nprint(x)`, out: String(x), why: 'La x de dentro de la función es una variable local distinta.' }; },
        (r, t) => { const a = ri(r, 1, sc(t, 9, 20)), k = ri(r, 1, 9); return { code: `def doble(x):\n    return x * 2\n\ndef f(x):\n    return doble(x) + ${k}\n\nprint(f(${a}))`, out: String(a * 2 + k), why: 'Una función puede llamar a otra.' }; },
        (r, t) => { const n = ri(r, 0, sc(t, 30, 100)); return { code: `def clasifica(n):\n    if n % 2 == 0:\n        return "par"\n    return "impar"\n\nprint(clasifica(${n}))`, out: n % 2 === 0 ? 'par' : 'impar' }; },
        (r) => { const a = ri(r, 1, 9); return { code: `def f(x):\n    x + 1\n\nprint(f(${a}))`, out: 'None', why: 'Sin return la función devuelve None.' }; },
      ],
      F: [
        (r, t) => { const k = ri(r, 2, 9), a = ri(r, 2, sc(t, 9, 12)); return { q: 'Completa la palabra que devuelve el resultado:', code: `def f(x):\n    ___ x * ${k}\n\nprint(f(${a}))`, a: ['return'], out: String(a * k) }; },
        (r, t) => { const a = ri(r, 1, 9), d = ri(r, 1, sc(t, 9, 20)); return { q: `¿Qué valor por defecto hace que f(${a}) muestre ${a + d}?`, code: `def f(x, y=___):\n    return x + y\n\nprint(f(${a}))`, a: [String(d)], out: String(a + d) }; },
        (r) => { const a = ri(r, 2, 9); return { q: 'Completa la palabra que define una función:', code: `___ doble(x):\n    return x * 2\n\nprint(doble(${a}))`, a: ['def'], out: String(a * 2) }; },
      ],
      C: [TF('return termina la ejecución de la función.', true), TF('Una función sin return devuelve None.', true), C('¿Qué palabra define una función en Python?', ['def', 'func', 'function', 'fn'], 0), PR('Relaciona:', [['def', 'Define una función'], ['return', 'Devuelve un valor'], ['parámetro', 'Dato que recibe la función'], ['argumento', 'Valor que pasas al llamarla']]), OR('Ordena el programa:', ['def doble(x):', '    return x * 2', 'print(doble(4))']), TF('Las variables creadas dentro de una función existen fuera de ella.', false, 'Son locales.')] },

    { name: 'Textos y diccionarios', icon: '🗂', color: '#ff7a59', desc: 'split, join, f-strings, dict y tuplas',
      tip: 'Los textos tienen métodos: split, join, replace, count, find, strip, title. Un diccionario guarda pares clave: valor y se consulta con d[clave] o d.get(clave, defecto). Una tupla es como una lista que no se puede modificar. Las f-strings insertan valores: f"{nombre}".', demo: 'd = {\'sol\': 3}\nprint(d.get(\'luna\', 0))  # 0',
      T: [
        (r) => { const ws = [pk(r, ASCII), pk(r, ASCII), pk(r, ASCII)], sep = pk(r, ['-', ',', ' ']); return r() < 0.5 ? { code: `print("${ws.join(sep)}".split("${sep}"))`, out: pl(ws), why: 'split separa el texto en una lista.' } : { code: `print("${sep}".join(${pl(ws)}))`, out: ws.join(sep), why: 'join une los elementos con el separador.' }; },
        (r) => { const w = pk(r, ASCII), c = pk(r, [...w]), d = pk(r, ['x', 'y', '*', '#']); return { code: `print("${w}".replace("${c}", "${d}"))`, out: w.split(c).join(d), why: 'replace cambia todas las apariciones.' }; },
        (r) => { const w = pk(r, ASCII) + pk(r, ASCII), c = pk(r, [...'aeiou']); return r() < 0.5 ? { code: `print("${w}".count("${c}"))`, out: String(w.split(c).length - 1) } : { code: `print("${w}".find("${c}"))`, out: String(w.indexOf(c)), why: 'find devuelve la posición o -1 si no está.' }; },
        (r, t) => { const ks = shuf(r, ASCII).slice(0, ri(r, 2, 4)), d = ks.map((k) => [k, ri(r, 1, sc(t, 9, 90))]), k = pk(r, ks); return { code: `d = ${pd(d)}\nprint(d['${k}'])`, out: String(d.find((x) => x[0] === k)[1]) }; },
        (r) => { const ks = shuf(r, ASCII), d = ks.slice(0, 3).map((k) => [k, ri(r, 1, 50)]), miss = ks[3], v = ri(r, 0, 9); return { code: `d = ${pd(d)}\nprint(d.get('${miss}', ${v}))`, out: String(v), why: 'get devuelve el valor por defecto si la clave no existe.' }; },
        (r) => { const ks = shuf(r, ASCII).slice(0, 4), d = ks.slice(0, 3).map((k) => [k, ri(r, 1, 50)]), m = Math.floor(r() * 3); if (m === 0) return { code: `d = ${pd(d)}\nprint(len(d))`, out: '3' }; if (m === 1) return { code: `d = ${pd(d)}\nprint('${ks[3]}' in d)`, out: 'False', why: 'in busca entre las claves.' }; return { code: `d = ${pd(d)}\nprint(list(d.keys()))`, out: pl(ks.slice(0, 3)) }; },
        (r) => { const ks = shuf(r, ASCII).slice(0, 3), d = ks.slice(0, 2).map((k) => [k, ri(r, 1, 20)]), nk = r() < 0.5 ? ks[2] : ks[0], v = ri(r, 21, 99); const nd = d.map((x) => x.slice()); const f = nd.find((x) => x[0] === nk); if (f) f[1] = v; else nd.push([nk, v]); return { code: `d = ${pd(d)}\nd['${nk}'] = ${v}\nprint(d)`, out: pd(nd), why: 'Asignar a una clave existente la actualiza; si no existe, la crea.' }; },
        (r) => { const n = pk(r, NAMES), a = ri(r, 10, 60); return { code: `name = "${n}"\nage = ${a}\nprint(f"{name} tiene {age} años")`, out: `${n} tiene ${a} años`, why: 'Las f-strings insertan los valores entre llaves.' }; },
        (r) => { const w = pk(r, WORDS); const m = Math.floor(r() * 3); if (m === 0) return { code: `print("  ${w}  ".strip())`, out: w, why: 'strip quita los espacios de los extremos.' }; if (m === 1) return { code: `print("${w}".title())`, out: w[0].toUpperCase() + w.slice(1) }; return { code: `print("${w}".startswith("${w[0]}"))`, out: 'True' }; },
        (r) => { const x = ri(r, 1, 50), y = ri(r, 51, 99); return { code: `a, b = (${x}, ${y})\nprint(b, a)`, out: `${y} ${x}`, why: 'Una tupla se puede desempaquetar en variables.' }; },
      ],
      F: [
        (r) => { const ks = shuf(r, ASCII), d = ks.slice(0, 2).map((k) => [k, ri(r, 1, 50)]), v = ri(r, 0, 9); return { q: 'Completa el método que da un valor por defecto:', code: `d = ${pd(d)}\nprint(d.___('${ks[3]}', ${v}))`, a: ['get'], out: String(v) }; },
        (r) => { const ws = [pk(r, ASCII), pk(r, ASCII)]; return { q: 'Completa el método que une una lista con guiones:', code: `print("-".___(${pl(ws)}))`, a: ['join'], out: ws.join('-') }; },
        (r) => { const w = pk(r, ASCII) + pk(r, ASCII), c = pk(r, [...'aeiou']); return { q: `Completa el método que cuenta cuántas veces aparece «${c}»:`, code: `print("${w}".___("${c}"))`, a: ['count'], out: String(w.split(c).length - 1) }; },
      ],
      C: [TF('Un diccionario guarda pares clave-valor.', true), TF('Una tupla se puede modificar después de crearla.', false, 'Las tuplas son inmutables.'), C('¿Qué devuelve d.get("x", 0) si "x" no existe?', ['0', 'Un error', 'None', '"x"'], 0), PR('Relaciona:', [['split()', 'Divide un texto en lista'], ['join()', 'Une elementos con un separador'], ['replace()', 'Cambia partes del texto'], ['strip()', 'Quita espacios de los extremos']]), TF('En un diccionario las claves pueden repetirse.', false, 'Cada clave es única.'), C('¿Qué crea f"{a} y {b}"?', ['Un texto con los valores de a y b', 'Una lista', 'Un error', 'Un diccionario'], 0)] },

    { name: 'Algoritmos', icon: '🧠', color: '#38d6e8', desc: 'factorial, Fibonacci, MCD, primos y más',
      tip: 'Un algoritmo es una receta paso a paso. Traza cada vuelta del bucle anotando el valor de las variables. Clásicos: factorial, Fibonacci, máximo común divisor (Euclides), suma de dígitos con % y //, números primos y un paso de ordenamiento burbuja.', demo: 'a, b = 12, 18\nwhile b:\n    a, b = b, a % b\nprint(a)  # 6',
      T: [
        (r, t) => { const n = ri(r, 3, sc(t, 6, 6)); return { code: `r = 1\nfor i in range(2, ${n + 1}):\n    r *= i\nprint(r)`, out: String(fact(n)), why: `Es el factorial de ${n}.` }; },
        (r, t) => { const n = ri(r, 5, sc(t, 10, 28)); return { code: `a, b = 0, 1\nfor _ in range(${n}):\n    a, b = b, a + b\nprint(a)`, out: String(fibn(n)), why: `Calcula el término ${n} de Fibonacci.` }; },
        (r, t) => { const a = ri(r, 6, sc(t, 40, 400)), b = ri(r, 6, sc(t, 40, 400)); return { code: `a, b = ${a}, ${b}\nwhile b:\n    a, b = b, a % b\nprint(a)`, out: String(gcd(a, b)), why: 'Es el algoritmo de Euclides: el máximo común divisor.' }; },
        (r, t) => { const n = ri(r, 100, sc(t, 999, 99000)); let s = 0; for (const d of String(n)) s += +d; return { code: `n = ${n}\ns = 0\nwhile n > 0:\n    s += n % 10\n    n //= 10\nprint(s)`, out: String(s), why: 'n % 10 toma la última cifra y n // 10 la elimina.' }; },
        (r, t) => { const n = ri(r, 10, sc(t, 20, 60)); let c = 0; for (let k = 2; k < n; k++) { let p = true; for (let d = 2; d < k; d++) if (k % d === 0) { p = false; break; } if (p) c++; } return { code: `count = 0\nfor n in range(2, ${n}):\n    for d in range(2, n):\n        if n % d == 0:\n            break\n    else:\n        count += 1\nprint(count)`, out: String(c), why: 'El else del for se ejecuta si el bucle no hizo break: el número es primo.' }; },
        (r, t) => { const n = ri(r, 10, sc(t, 30, 70)); let c = 0; for (let i = 1; i <= n; i++) if (i % 3 === 0 || i % 5 === 0) c++; return { code: `c = 0\nfor i in range(1, ${n + 1}):\n    if i % 3 == 0 or i % 5 == 0:\n        c += 1\nprint(c)`, out: String(c) }; },
        (r) => { const w = pk(r, ['reconocer', 'oso', 'radar', 'sol', 'neuquen', 'casa', 'ana', 'mesa', 'somos', 'faro']); return { code: `s = "${w}"\nprint(s == s[::-1])`, out: w === [...w].reverse().join('') ? 'True' : 'False', why: 'Un palíndromo se lee igual al derecho y al revés.' }; },
        (r, t) => { const a = arr(r, t, ri(r, 4, 5)); const b = a.slice(); for (let i = 0; i < b.length - 1; i++) if (b[i] > b[i + 1]) [b[i], b[i + 1]] = [b[i + 1], b[i]]; return { code: `a = ${pl(a)}\nfor i in range(len(a) - 1):\n    if a[i] > a[i + 1]:\n        a[i], a[i + 1] = a[i + 1], a[i]\nprint(a)`, out: pl(b), why: 'Una pasada de burbuja lleva el mayor al final.' }; },
        (r, t) => { const n = ri(r, 2, sc(t, 15, 200)); return { code: `print(bin(${n}))`, out: '0b' + n.toString(2), why: 'bin() da la representación binaria.' }; },
      ],
      F: [
        (r, t) => { const a = ri(r, 6, sc(t, 40, 300)), b = ri(r, 6, sc(t, 40, 300)); return { q: 'Completa la palabra del bucle de Euclides:', code: `a, b = ${a}, ${b}\n___ b:\n    a, b = b, a % b\nprint(a)`, a: ['while'], out: String(gcd(a, b)) }; },
        (r, t) => { const n = ri(r, 100, sc(t, 999, 9999)); let s = 0; for (const d of String(n)) s += +d; return { q: 'Completa el operador que obtiene la última cifra:', code: `n = ${n}\ns = 0\nwhile n > 0:\n    s += n ___ 10\n    n //= 10\nprint(s)`, a: ['%'], out: String(s) }; },
        (r, t) => { const n = ri(r, 100, sc(t, 999, 9999)); let s = 0; for (const d of String(n)) s += +d; return { q: 'Completa el operador que elimina la última cifra:', code: `n = ${n}\ns = 0\nwhile n > 0:\n    s += n % 10\n    n ___= 10\nprint(s)`, a: ['//'], out: String(s) }; },
      ],
      C: [TF('El algoritmo de Euclides calcula el máximo común divisor.', true), C('¿Cuánto es 5! (factorial de 5)?', ['120', '25', '60', '15'], 0), TF('bin(5) devuelve "0b101".', true), PR('Relaciona:', [['n % 10', 'Última cifra'], ['n // 10', 'Quita la última cifra'], ['a % b', 'Resto de la división'], ['s[::-1]', 'Texto al revés']]), TF('Un número primo tiene exactamente dos divisores.', true), C('¿Qué secuencia genera Fibonacci?', ['0, 1, 1, 2, 3, 5, 8…', '1, 2, 4, 8…', '1, 3, 5, 7…', '2, 4, 6, 8…'], 0)] },

    { name: 'Errores y depuración', icon: '🐞', color: '#ff3d5a', desc: 'excepciones, try/except y errores típicos',
      tip: 'Los errores (excepciones) detienen el programa: IndexError (índice fuera de rango), KeyError (clave inexistente), ValueError (valor con formato incorrecto), TypeError (tipos incompatibles), ZeroDivisionError y NameError (nombre sin definir). try/except los captura; finally se ejecuta siempre.', demo: 'try:\n    print(1 / 0)\nexcept ZeroDivisionError:\n    print("no se puede")',
      T: [
        (r, t) => { const a = arr(r, t, ri(r, 3, 5)), i = a.length + ri(r, 0, 3); return { code: `nums = ${pl(a)}\nprint(nums[${i}])`, out: 'IndexError', err: true, why: `La lista tiene ${a.length} elementos: el último índice válido es ${a.length - 1}.` }; },
        (r) => { const ks = shuf(r, ASCII); return { code: `d = {'${ks[0]}': 1, '${ks[1]}': 2}\nprint(d['${ks[2]}'])`, out: 'KeyError', err: true, why: 'La clave no existe en el diccionario.' }; },
        (r) => ({ code: `print(int("${pk(r, ASCII)}"))`, out: 'ValueError', err: true, why: 'Un texto que no es un número no se puede convertir con int().' }),
        (r) => ({ code: `print("${pk(r, WORDS)}" + ${ri(r, 1, 9)})`, out: 'TypeError', err: true, why: 'No se puede sumar un texto y un número.' }),
        (r) => { const a = ri(r, 2, 30), b = ri(r, 2, 9); return { code: `x = ${a}\nprint(x / (${b} - ${b}))`, out: 'ZeroDivisionError', err: true, why: 'El divisor vale 0.' }; },
        (r) => ({ code: `valor = ${ri(r, 1, 99)}\nprint(valo)`, out: 'NameError', err: true, why: 'El nombre «valo» no está definido (¿errata?).' }),
        (r) => { const w = pk(r, ASCII), k = ri(r, 1, 99); return { code: `try:\n    x = int("${w}")\nexcept ValueError:\n    x = ${k}\nprint(x)`, out: String(k), why: 'El error se captura y x toma el valor del except.' }; },
        (r) => { const w = pk(r, ASCII); return { code: `try:\n    print(10 / 0)\nexcept ZeroDivisionError:\n    print("${w}", end=" ")\nfinally:\n    print("fin")`, out: `${w} fin`, why: 'finally se ejecuta siempre, haya o no error.' }; },
        (r, t) => { const n = ri(r, 4, sc(t, 10, 20)); let s = 0; for (let i = 1; i < n; i++) s += i; return { q: '¿Qué muestra? (cuidado con el final de range)', code: `total = 0\nfor i in range(1, ${n}):\n    total += i\nprint(total)`, out: String(s), why: `range(1, ${n}) termina en ${n - 1}: no incluye ${n}.` }; },
      ],
      F: [
        (r) => { const w = pk(r, ASCII); return { q: 'Completa la palabra que captura el error:', code: `try:\n    print(1 / 0)\n___ ZeroDivisionError:\n    print("${w}")`, a: ['except'], out: w }; },
        (r) => { const w = pk(r, ASCII); return { q: 'Completa la palabra del bloque que siempre se ejecuta:', code: `try:\n    print("${w}", end=" ")\n___:\n    print("fin")`, a: ['finally'], out: `${w} fin` }; },
        (r, t) => { const a = arr(r, t, ri(r, 3, 6)); return { q: 'Elige un índice válido para que no falle (el último elemento):', code: `nums = ${pl(a)}\nprint(nums[___])`, a: ['-1', String(a.length - 1)], out: String(a[a.length - 1]) }; },
      ],
      C: [C('¿Qué excepción aparece al dividir entre cero?', ['ZeroDivisionError', 'ValueError', 'IndexError', 'NameError'], 0), TF('Un bloque try/except evita que el programa se detenga por el error.', true), TF('IndexError aparece al usar un índice fuera de la lista.', true), PR('Relaciona:', [['IndexError', 'Índice fuera de rango'], ['KeyError', 'Clave inexistente'], ['ValueError', 'Valor con formato incorrecto'], ['TypeError', 'Tipos incompatibles']]), C('Recorrer una lista de n elementos una sola vez tiene complejidad…', ['O(n)', 'O(1)', 'O(n²)', 'O(log n)'], 0), C('Buscar un valor en una lista desordenada de n elementos es…', ['O(n)', 'O(1)', 'O(log n)', 'O(n²)'], 0)] },

    { name: 'Maestría', icon: '👑', color: '#ffd43b', desc: 'recursión, comprensiones, lambda y complejidad',
      tip: 'Una función recursiva se llama a sí misma y necesita un caso base. Las comprensiones, map, filter, zip y enumerate permiten escribir código compacto; sorted admite key=; lambda crea funciones sin nombre. Dos bucles anidados de n vueltas cada uno son O(n²).', demo: 'def f(n):\n    return 1 if n <= 1 else n * f(n - 1)\n\nprint(f(5))  # 120',
      T: [
        (r, t) => { const n = ri(r, 3, sc(t, 6, 4)); return { code: `def f(n):\n    if n <= 1:\n        return 1\n    return n * f(n - 1)\n\nprint(f(${n}))`, out: String(fact(n)), why: 'f(n) = n × f(n-1) hasta llegar al caso base.' }; },
        (r, t) => { const n = ri(r, 5, sc(t, 8, 5)); return { code: `def fib(n):\n    if n < 2:\n        return n\n    return fib(n - 1) + fib(n - 2)\n\nprint(fib(${n}))`, out: String(fibn(n)) }; },
        (r, t) => { const a = ri(r, 2, sc(t, 4, 6)), b = ri(r, 2, sc(t, 4, 6)); let c = 0; for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) if ((i + j) % 2 === 0) c++; return { code: `c = 0\nfor i in range(${a}):\n    for j in range(${b}):\n        if (i + j) % 2 == 0:\n            c += 1\nprint(c)`, out: String(c), why: 'Los bucles anidados se recorren como una tabla.' }; },
        (r, t) => { const n = ri(r, 8, sc(t, 20, 40)); return r() < 0.5 ? { code: `print([x for x in range(${n}) if x % 2 == 0 and x % 3 == 0])`, out: pl(Array.from({ length: n }, (_, i) => i).filter((x) => x % 2 === 0 && x % 3 === 0)) } : { code: `print(sum(x * x for x in range(${n}) if x % 2 == 1))`, out: String(Array.from({ length: n }, (_, i) => i).filter((x) => x % 2 === 1).reduce((s, x) => s + x * x, 0)) }; },
        (r) => { const ws = shuf(r, LEN_WORDS).slice(0, 4); return r() < 0.5 ? { code: `print(sorted(${pl(ws)}, key=len))`, out: pl([...ws].sort((x, y) => x.length - y.length)), why: 'key=len ordena por longitud.' } : { code: `print(max(${pl(ws)}, key=len))`, out: ws.reduce((m, x) => (x.length > m.length ? x : m)), why: 'max con key=len devuelve el más largo.' }; },
        (r) => { const w = pk(r, ASCII); const m = new Map(); for (const ch of w) m.set(ch, w.split(ch).length - 1); return { code: `s = "${w}"\nprint({ch: s.count(ch) for ch in s})`, out: pd([...m]), why: 'Una comprensión de diccionario cuenta cada letra.' }; },
        (r, t) => { const a = arr(r, t, 4), b = arr(r, t, 4); return { code: `a = ${pl(a)}\nb = ${pl(b)}\nprint([x + y for x, y in zip(a, b)])`, out: pl(a.map((x, i) => x + b[i])), why: 'zip empareja los elementos de las dos listas.' }; },
        (r, t) => { const a = arr(r, t, ri(r, 3, 5)), k = ri(r, 2, 5); return { code: `print(list(map(lambda x: x * ${k}, ${pl(a)})))`, out: pl(a.map((x) => x * k)), why: 'map aplica la función a cada elemento.' }; },
        (r, t) => { const a = arr(r, t, ri(r, 6, 9)); return r() < 0.5 ? { code: `nums = ${pl(a)}\nprint(nums[::2])`, out: pl(a.filter((_, i) => i % 2 === 0)), why: '[::2] toma un elemento sí y otro no desde el principio.' } : { code: `nums = ${pl(a)}\nprint(nums[1::2])`, out: pl(a.filter((_, i) => i % 2 === 1)) }; },
        (r) => { const w = pk(r, ASCII.filter((x) => !x.includes('z'))); return { code: `print("".join(chr(ord(c) + 1) for c in "${w}"))`, out: [...w].map((c) => String.fromCharCode(c.charCodeAt(0) + 1)).join(''), why: 'ord da el código de la letra y chr la vuelve a convertir.' }; },
        (r, t) => { const a = arr(r, t, ri(r, 3, 5)), k = ri(r, 1, 15); return { code: `print(all(x > ${k} for x in ${pl(a)}))`, out: a.every((x) => x > k) ? 'True' : 'False', why: 'all es True solo si todos cumplen la condición.' }; },
        (r) => { const w1 = pk(r, ASCII), w2 = pk(r, ASCII); return { code: `print(" ".join(w[::-1] for w in "${w1} ${w2}".split()))`, out: [w1, w2].map((w) => [...w].reverse().join('')).join(' ') }; },
      ],
      F: [
        (r, t) => { const a = arr(r, t, ri(r, 4, 6)); return { q: 'Completa la palabra que filtra en la comprensión:', code: `nums = ${pl(a)}\nprint([x for x in nums ___ x % 2 == 0])`, a: ['if'], out: pl(a.filter((x) => x % 2 === 0)) }; },
        (r) => ({ q: 'Completa la palabra que crea una función anónima:', code: `print(list(map(___ x: x * ${ri(r, 2, 5)}, [1, 2, 3])))`.replace(/x \* (\d)/, (_, k) => `x * ${k}`), a: ['lambda'], out: '' }),
        (r) => { const ws = shuf(r, LEN_WORDS).slice(0, 4); return { q: 'Completa la función que ordena por longitud:', code: `print(sorted(${pl(ws)}, key=___))`, a: ['len'], out: pl([...ws].sort((x, y) => x.length - y.length)) }; },
        (r, t) => { const n = ri(r, 3, sc(t, 6, 4)); return { q: 'Completa el operador de la llamada recursiva:', code: `def f(n):\n    if n <= 1:\n        return 1\n    return n * f(n ___ 1)\n\nprint(f(${n}))`, a: ['-'], out: String(fact(n)) }; },
      ],
      C: [TF('Una función recursiva necesita un caso base.', true), TF('lambda crea una función sin nombre.', true), C('¿Qué hace sorted(lista, key=len)?', ['Ordena por longitud', 'Ordena alfabéticamente', 'Cuenta elementos', 'Invierte la lista'], 0), PR('Relaciona:', [['map()', 'Transforma cada elemento'], ['filter()', 'Conserva los que cumplen una condición'], ['zip()', 'Une listas elemento a elemento'], ['enumerate()', 'Da índice y valor']]), C('Dos bucles anidados de n vueltas cada uno tienen complejidad…', ['O(n²)', 'O(n)', 'O(1)', 'O(2n)'], 0), TF('Una comprensión de lista puede incluir una condición if.', true)] },
  ];

  // F[1] de Maestría necesita su resultado: se calcula con el valor real de k
  STAGES[9].F[1] = (r) => { const k = ri(r, 2, 5); return { q: 'Completa la palabra que crea una función anónima:', code: `print(list(map(___ x: x * ${k}, [1, 2, 3])))`, a: ['lambda'], out: pl([1, 2, 3].map((x) => x * k)) }; };
  // comentario de Primeros pasos: salida real
  STAGES[0].T[3] = (r) => { const w = pk(r, WORDS); return { code: `# esto es una nota\nprint("${w}")  # otra nota\n# print("no")`, out: w, why: 'Todo lo que sigue a # es un comentario y Python lo ignora.' }; };

  const PER = 50;
  function build(si, li) {
    const S = STAGES[si], r = rng((si + 1) * 1009 + (li + 1) * 7919), t = li / (PER - 1), T = S.T, i1 = Math.floor(r() * T.length), i2 = (i1 + 1 + Math.floor(r() * (T.length - 1))) % T.length, i3 = Math.floor(r() * T.length);
    const hard = Math.min(1, t + 0.25), conc = S.C[(li * 5 + si) % S.C.length];
    return [choice(r, T[i1](r, t)), fill(S.F[li % S.F.length](r, t)), conc, choice(r, T[i2](r, t)), choice(r, T[i3](r, hard))];
  }
  window.NEXUS_PATH = {
    per: PER, stages: STAGES.map((s, i) => ({ n: i + 1, name: s.name, icon: s.icon, color: s.color, desc: s.desc, tip: s.tip, demo: s.demo })),
    level: (si, li) => ({ title: `Etapa ${si + 1} · Nivel ${li + 1}`, ex: build(si, li) }),
    stars: (si, li) => 1 + Math.floor((si * PER + li) / 100),   // dificultad global 1–5
    kit: { rng, ri, pk, shuf, wrongs, choice, fill, C, TF, OR, PR, WORDS, sc },
  };
  window.NEXUS_PATH.id = 'py';
})();
