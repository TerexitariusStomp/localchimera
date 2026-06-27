import{aV as u,cC as F,cP as V,aY as e,aU as B}from"./index-6efb313d.js";import{t as N}from"./ExclamationTriangleIcon-393e9907.js";import{n as W}from"./WalletIcon-97b1444f.js";import{T as $,m as E,$ as P,u as M}from"./ModalHeader-YbJk-YIQ-63727d18.js";import{g as i}from"./index-77dae828.js";import{i as U}from"./StackedContainer-B2vaEl56-35d587b4.js";import{d as z}from"./Address-Wk5-LLxD-3e8d0722.js";import{e as H}from"./capitalizeFirstLetter-DmLYqXsO-c66a2163.js";import{F as _}from"./ExclamationCircleIcon-479a5981.js";import"./check-fbdaa4bc.js";import"./createLucideIcon-9f7c018a.js";import"./copy-8ea7b53d.js";function q({title:o,titleId:s,...r},l){return u.createElement("svg",Object.assign({xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor","aria-hidden":"true","data-slot":"icon",ref:l,"aria-labelledby":s},r),o?u.createElement("title",{id:s},o):null,u.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 0 0-2.25 2.25v6"}))}const O=u.forwardRef(q),Y=O,G=i.span`
  && {
    width: 82px;
    height: 82px;
    border-width: 4px;
    border-style: solid;
    border-color: ${o=>o.color??"var(--privy-color-accent)"};
    border-bottom-color: transparent;
    border-radius: 50%;
    display: inline-block;
    box-sizing: border-box;
    animation: rotation 1.2s linear infinite;
    transition: border-color 800ms;
    border-bottom-color: ${o=>o.color??"var(--privy-color-accent)"};
  }
`;function J(o){return e.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"24",height:"24",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",...o,children:[e.jsx("circle",{cx:"12",cy:"12",r:"10"}),e.jsx("line",{x1:"12",x2:"12",y1:"8",y2:"12"}),e.jsx("line",{x1:"12",x2:"12.01",y1:"16",y2:"16"})]})}const L=({onTransfer:o,isTransferring:s,transferSuccess:r})=>e.jsx(E,{...r?{success:!0,children:"Success!"}:{warn:!0,loading:s,onClick:o,children:"Transfer and delete account"}}),I=i.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding-bottom: 16px;
`,v=i.div`
  display: flex;
  flex-direction: column;
  && p {
    font-size: 14px;
  }
  width: 100%;
  gap: 16px;
`,R=i.div`
  display: flex;
  cursor: pointer;
  align-items: center;
  width: 100%;
  border: 1px solid var(--privy-color-foreground-4) !important;
  border-radius: var(--privy-border-radius-md);
  padding: 8px 10px;
  font-size: 14px;
  font-weight: 500;
  gap: 8px;
`,K=i(_)`
  position: relative;
  width: ${({$iconSize:o})=>`${o}px`};
  height: ${({$iconSize:o})=>`${o}px`};
  color: var(--privy-color-foreground-3);
  margin-left: auto;
`,Q=i(Y)`
  position: relative;
  width: 15px;
  height: 15px;
  color: var(--privy-color-foreground-3);
  margin-left: auto;
`,X=i.ol`
  display: flex;
  flex-direction: column;
  font-size: 14px;
  width: 100%;
  text-align: left;
`,S=i.li`
  font-size: 14px;
  list-style-type: auto;
  list-style-position: outside;
  margin-left: 1rem;
  margin-bottom: 0.5rem; /* Adjust the margin as needed */

  &:last-child {
    margin-bottom: 0; /* Remove margin from the last item */
  }
`,Z=i.div`
  position: relative;
  width: 60px;
  height: 60px;
  margin: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
`;let ee=()=>e.jsx(Z,{children:e.jsx(K,{$iconSize:60})});const re=({address:o,onClose:s,onRetry:r,onTransfer:l,isTransferring:h,transferSuccess:f})=>{var c;let{defaultChain:n}=B(),a=((c=n.blockExplorers)==null?void 0:c.default.url)??"https://etherscan.io";return e.jsxs(e.Fragment,{children:[e.jsx($,{onClose:s,backFn:r}),e.jsxs(I,{children:[e.jsx(ee,{}),e.jsxs(v,{children:[e.jsx("h3",{children:"Check account assets before transferring"}),e.jsx("p",{children:"Before transferring, ensure there are no assets in the other account. Assets in that account will not transfer automatically and may be lost."}),e.jsxs(X,{children:[e.jsx("p",{children:" To check your balance, you can:"}),e.jsx(S,{children:"Log out and log back into the other account, or "}),e.jsxs(S,{children:["Copy your wallet address and use a"," ",e.jsx("u",{children:e.jsx("a",{target:"_blank",href:a,children:"block explorer"})})," ","to see if the account holds any assets."]})]}),e.jsxs(R,{onClick:()=>navigator.clipboard.writeText(o).catch(console.error),children:[e.jsx(W,{color:"var(--privy-color-foreground-1)",strokeWidth:2,height:"28px",width:"28px"}),e.jsx(z,{address:o,showCopyIcon:!1}),e.jsx(Q,{})]}),e.jsx(L,{onTransfer:l,isTransferring:h,transferSuccess:f})]})]}),e.jsx(M,{})]})},me={component:()=>{let{initiateAccountTransfer:o,closePrivyModal:s}=F(),{data:r,navigate:l,lastScreen:h,setModalData:f}=V(),[n,a]=u.useState(void 0),[c,y]=u.useState(!1),[p,x]=u.useState(!1),m=async()=>{var t,j,d,w,b,T,g,k,C,A;try{if(!((t=r==null?void 0:r.accountTransfer)!=null&&t.nonce)||!((j=r==null?void 0:r.accountTransfer)!=null&&j.account))throw Error("missing account transfer inputs");x(!0),await o({nonce:(d=r==null?void 0:r.accountTransfer)==null?void 0:d.nonce,account:(w=r==null?void 0:r.accountTransfer)==null?void 0:w.account,accountType:(b=r==null?void 0:r.accountTransfer)==null?void 0:b.linkMethod,externalWalletMetadata:(T=r==null?void 0:r.accountTransfer)==null?void 0:T.externalWalletMetadata,telegramWebAppData:(g=r==null?void 0:r.accountTransfer)==null?void 0:g.telegramWebAppData,telegramAuthResult:(k=r==null?void 0:r.accountTransfer)==null?void 0:k.telegramAuthResult,farcasterEmbeddedAddress:(C=r==null?void 0:r.accountTransfer)==null?void 0:C.farcasterEmbeddedAddress,oAuthUserInfo:(A=r==null?void 0:r.accountTransfer)==null?void 0:A.oAuthUserInfo}),y(!0),x(!1),setTimeout(s,1e3)}catch(D){f({errorModalData:{error:D,previousScreen:h||"LinkConflictScreen"}}),l("ErrorScreen",!0)}};return n?e.jsx(re,{address:n,onClose:s,onRetry:()=>a(void 0),onTransfer:m,isTransferring:p,transferSuccess:c}):e.jsx(ne,{onClose:s,onInfo:()=>{var t;return a((t=r==null?void 0:r.accountTransfer)==null?void 0:t.embeddedWalletAddress)},onContinue:()=>{var t;return a((t=r==null?void 0:r.accountTransfer)==null?void 0:t.embeddedWalletAddress)},onTransfer:m,isTransferring:p,transferSuccess:c,data:r})}},ne=({onClose:o,onContinue:s,onInfo:r,onTransfer:l,transferSuccess:h,isTransferring:f,data:n})=>{var c,y,p,x,m,t,j;if(!((c=n==null?void 0:n.accountTransfer)!=null&&c.linkMethod)||!((y=n==null?void 0:n.accountTransfer)!=null&&y.displayName))return;let a={method:(p=n==null?void 0:n.accountTransfer)==null?void 0:p.linkMethod,handle:(x=n==null?void 0:n.accountTransfer)==null?void 0:x.displayName,disclosedAccount:(m=n==null?void 0:n.accountTransfer)!=null&&m.embeddedWalletAddress?{type:"wallet",handle:(t=n==null?void 0:n.accountTransfer)==null?void 0:t.embeddedWalletAddress}:void 0};return e.jsxs(e.Fragment,{children:[e.jsx($,{closeable:!0}),e.jsxs(I,{children:[e.jsx(U,{children:e.jsxs("div",{children:[e.jsx(G,{color:"var(--privy-color-error)"}),e.jsx(N,{height:38,width:38,stroke:"var(--privy-color-error)"})]})}),e.jsxs(v,{children:[e.jsxs("h3",{children:[function(d){switch(d){case"sms":return"Phone number";case"email":return"Email address";case"siwe":return"Wallet address";case"siws":return"Solana wallet address";case"linkedin":return"LinkedIn profile";case"google":case"apple":case"discord":case"github":case"instagram":case"spotify":case"tiktok":case"line":case"twitch":case"twitter":case"telegram":case"farcaster":return`${H(d.replace("_oauth",""))} profile`;default:return d.startsWith("privy:")?"Cross-app account":d}}(a.method)," is associated with another account"]}),e.jsxs("p",{children:["Do you want to transfer",e.jsx("b",{children:a.handle?` ${a.handle}`:""})," to this account instead? This will delete your other account."]}),e.jsx(oe,{onClick:r,disclosedAccount:a.disclosedAccount})]}),e.jsxs(v,{style:{gap:12,marginTop:12},children:[(j=n==null?void 0:n.accountTransfer)!=null&&j.embeddedWalletAddress?e.jsx(E,{onClick:s,children:"Continue"}):e.jsx(L,{onTransfer:l,transferSuccess:h,isTransferring:f}),e.jsx(P,{onClick:o,children:"No thanks"})]})]}),e.jsx(M,{})]})};function oe({disclosedAccount:o,onClick:s}){return o?e.jsxs(R,{onClick:s,children:[e.jsx(W,{color:"var(--privy-color-foreground-1)",strokeWidth:2,height:"28px",width:"28px"}),e.jsx(z,{address:o.handle,showCopyIcon:!1}),e.jsx(J,{width:15,height:15,color:"var(--privy-color-foreground-3)",style:{marginLeft:"auto"}})]}):null}export{me as LinkConflictScreen,ne as LinkConflictScreenView,me as default};
