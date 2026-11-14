// Oddiy matematik ifodalarni xavfsiz(roq) kompilyatsiya qilish: "x^2 + sin(x)" -> function(x)
(function () {
  const ALLOWED = ['sin','cos','tan','asin','acos','atan','atan2','sinh','cosh','tanh','sqrt','cbrt','abs','exp','log','log10','log2','floor','ceil','round','sign','min','max','pow','PI','E','pi','e','ln'];
  function compile(expr, vars) {
    let src = String(expr).trim();
    if (!src) throw new Error('empty');
    if (/[^0-9a-zA-Z_+\-*/^().,\s]/.test(src)) throw new Error('bad char');
    const words = src.match(/[a-zA-Z_]\w*/g) || [];
    for (const w of words) {
      if (!vars.includes(w) && !ALLOWED.includes(w)) throw new Error('unknown: ' + w);
    }
    src = src.replace(/\^/g, '**');
    // 2x -> 2*x, 2( -> 2*(, )( -> )*(
    src = src.replace(/(^|[^a-zA-Z_\d.])(\d+(?:\.\d+)?)\s*(?=[a-zA-Z(])/g, '$1$2*').replace(/\)\s*\(/g, ')*(');
    const fn = new Function(...vars,
      'const {sin,cos,tan,asin,acos,atan,atan2,sinh,cosh,tanh,sqrt,cbrt,abs,exp,log10,log2,floor,ceil,round,sign,min,max,pow,PI,E}=Math;' +
      'const log=Math.log, ln=Math.log, pi=Math.PI, e=Math.E;' +
      'return (' + src + ');');
    // tekshirib ko‘rish
    fn(...vars.map(() => 0.5));
    return fn;
  }
  window.MathExpr = { compile };
})();
