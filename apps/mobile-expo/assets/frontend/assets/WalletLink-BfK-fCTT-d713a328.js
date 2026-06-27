import{aY as n,e6 as g,e5 as j}from"./index-6efb313d.js";import{g as l}from"./index-77dae828.js";import{m as c,o as d,c as m,i as $}from"./ethers-BwspWcmN-b7b04a00.js";import{C as k}from"./getFormattedUsdFromLamports-B6EqSEho-d9cc6165.js";import{t as y}from"./transaction-CnfuREWo-f8c15156.js";const P=({weiQuantities:e,tokenPrice:r,tokenSymbol:o})=>{let i=c(e),t=r?d(i,r):void 0,s=m(i,o);return n.jsx(a,{children:t||s})},D=({weiQuantities:e,tokenPrice:r,tokenSymbol:o})=>{let i=c(e),t=r?d(i,r):void 0,s=m(i,o);return n.jsx(a,{children:t?n.jsxs(n.Fragment,{children:[n.jsx(S,{children:"USD"}),t==="<$0.01"?n.jsxs(h,{children:[n.jsx(p,{children:"<"}),"$0.01"]}):t]}):s})},F=({quantities:e,tokenPrice:r,tokenSymbol:o="SOL",tokenDecimals:i=9})=>{let t=e.reduce((f,u)=>f+u,0n),s=r&&o==="SOL"&&i===9?k(t,r):void 0,x=o==="SOL"&&i===9?y(t):`${g(t,i)} ${o}`;return n.jsx(a,{children:s?n.jsx(n.Fragment,{children:s==="<$0.01"?n.jsxs(h,{children:[n.jsx(p,{children:"<"}),"$0.01"]}):s}):x})};let a=l.span`
  font-size: 14px;
  line-height: 140%;
  display: flex;
  gap: 4px;
  align-items: center;
`,S=l.span`
  font-size: 12px;
  line-height: 12px;
  color: var(--privy-color-foreground-3);
`,p=l.span`
  font-size: 10px;
`,h=l.span`
  display: flex;
  align-items: center;
`;function v(e,r){return`https://explorer.solana.com/account/${e}?chain=${r}`}const I=e=>n.jsx(w,{href:e.chainType==="ethereum"?$(e.chainId,e.walletAddress):v(e.walletAddress,e.chainId),target:"_blank",children:j(e.walletAddress)});let w=l.a`
  &:hover {
    text-decoration: underline;
  }
`;export{I as S,F as f,D as h,P as p};
