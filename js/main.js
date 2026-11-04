/* Lau Nails · animación de scroll (optimizada para móviles y equipos modestos) */
(function(){
var $=function(i){return document.getElementById(i)},sc=$("scene"),pic=$("pic"),wd=$("world"),lf=$("lf"),rt=$("rt"),sp=$("spill"),op=$("opn"),fl=$("flash"),pl=$("plum"),ht=$("hint"),he=$("hero"),hds=[$("hands")];
var lns=[].slice.call(document.querySelectorAll(".ln span")),sws=[].slice.call(document.querySelectorAll(".sw i"));
var RM=matchMedia("(prefers-reduced-motion: reduce)").matches,K=matchMedia("(pointer: coarse)").matches?1:.16;
var cur=0,tgt=0,run=0,rz=0,vw,vh,pw,sm,tp,m,sh;
function cl(x){return x<0?0:x>1?1:x}
function r(x){return Math.round(x*1000)/1000}
/* solo toca el DOM si el valor ha cambiado */
function set(el,k,v){var c=el._c||(el._c={});if(c[k]!==v){c[k]=v;el.style[k]=v}}
function size(){vw=innerWidth;vh=innerHeight;pw=.6667*vh;sm=1.3*Math.max(vw/(.4628*pw),1.02);tp=vw<600?104:132;m=vw<600?10:16;
  set(he,"inset",tp+"px "+m+"px "+m+"px");hds.forEach(function(e){set(e,"top",tp+"px")});sh=Math.max(1,sc.offsetHeight-vh)}
function read(){return cl(-sc.getBoundingClientRect().top/sh)}
function mv(){tgt=read();if(!run){run=1;requestAnimationFrame(step)}}
function step(){cur+=(tgt-cur)*K;if(Math.abs(tgt-cur)<.0004)cur=tgt;draw(cur);if(cur!==tgt)requestAnimationFrame(step);else run=0}
function draw(p){
  var a=cl(p/.3),d=cl((p-.16)/.34),z=cl((p-.5)/.38),f=cl((p-.84)/.14),c=cl((p-.8)/.18),q=cl((p-.9)/.08);
  set(pic,"transform","scale("+r(1+(sm-1)*z*z)+")");
  set(wd,"opacity",r(1-cl((p-.88)/.07)));set(wd,"visibility",p<.96?"visible":"hidden");
  set(op,"opacity",d>0?1:0);
  set(lf,"transform","rotateY("+r(d*100)+"deg)");set(rt,"transform","rotateY("+r(-d*100)+"deg)");
  set(sp,"opacity",r(d));set(ht,"opacity",r(1-cl(a*3)));
  set(fl,"opacity",r(Math.sin(cl((p-.62)/.28)*Math.PI)*.75));
  set(pl,"opacity",r(cl((p-.76)/.16)));
  set(pl,"clipPath","inset("+r(c*tp)+"px "+r(c*m)+"px "+r(c*m)+"px round "+r(c*34)+"px)");
  hds.forEach(function(e){set(e,"visibility",q>0?"visible":"hidden");set(e,"opacity",r(q));set(e,"transform","translateY("+r((1-q)*70)+"px)")});
  set(he,"visibility",f>0?"visible":"hidden");set(he,"opacity",r(cl(f*4)));
  lns.forEach(function(e,i){set(e,"transform","translateY("+r((1-cl((f-i*.22)/.55))*108)+"%)")});
  sws.forEach(function(e,i){var u=cl((f-.25-i*.07)/.5);set(e,"transform","translateY("+r((1-u)*50)+"px)");set(e,"opacity",r(u))});
}
size();
if(RM){draw(1)}else{
  cur=tgt=read();draw(cur);
  addEventListener("scroll",mv,{passive:true});
  addEventListener("resize",function(){if(!rz)rz=requestAnimationFrame(function(){rz=0;size();mv()})});
}
var io=("IntersectionObserver" in window)?new IntersectionObserver(function(e){e.forEach(function(x){if(x.isIntersecting)x.target.classList.add("in")})},{threshold:.12}):null;
window.lnReveal=function(root){[].forEach.call((root||document).querySelectorAll(".rv"),function(el){io?io.observe(el):el.classList.add("in")})};
window.lnReveal(document);
})();
