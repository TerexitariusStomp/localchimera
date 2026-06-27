import{aV as a,cQ as E,cC as R,cP as T,aY as e,d9 as I,ep as U}from"./index-6efb313d.js";import{o as V}from"./ShieldCheckIcon-0eb67f7b.js";import{bi as W,g as p,au as N}from"./index-77dae828.js";import{m as O}from"./ModalHeader-YbJk-YIQ-63727d18.js";import{l as F}from"./Layouts-BlFm53ED-fc301620.js";import{g as H,h as M,u as Y,b as B,k as D}from"./shared-Mx6bnMlK-14aea52b.js";import{w as s}from"./Screen-CdOj1bUg-f0af9018.js";import"./index-Dq_xe9dz-514db2a0.js";const te={component:()=>{let[o,y]=a.useState(!0),{authenticated:m,user:b}=E(),{walletProxy:i,closePrivyModal:v,createAnalyticsEvent:x,client:j}=R(),{navigate:k,data:A,onUserCloseViaDialogOrKeybindRef:$}=T(),[l,C]=a.useState(void 0),[f,c]=a.useState(""),[d,g]=a.useState(!1),{entropyId:h,entropyIdVerifier:P,onCompleteNavigateTo:w,onSuccess:u,onFailure:S}=A.recoverWallet,n=(r="User exited before their wallet could be recovered")=>{v({shouldCallAuthOnSuccess:!1}),S(typeof r=="string"?new U(r):r)};return $.current=n,a.useEffect(()=>{if(!m)return n("User must be authenticated and have a Privy wallet before it can be recovered")},[m]),e.jsxs(s,{children:[e.jsx(s.Header,{icon:V,title:"Enter your password",subtitle:"Please provision your account on this new device. To continue, enter your recovery password.",showClose:!0,onClose:n}),e.jsx(s.Body,{children:e.jsx(K,{children:e.jsxs("div",{children:[e.jsxs(H,{children:[e.jsx(M,{type:o?"password":"text",onChange:r=>(t=>{t&&C(t)})(r.target.value),disabled:d,style:{paddingRight:"2.3rem"}}),e.jsx(Y,{style:{right:"0.75rem"},children:o?e.jsx(B,{onClick:()=>y(!1)}):e.jsx(D,{onClick:()=>y(!0)})})]}),!!f&&e.jsx(L,{children:f})]})})}),e.jsxs(s.Footer,{children:[e.jsx(s.HelpText,{children:e.jsxs(F,{children:[e.jsx("h4",{children:"Why is this necessary?"}),e.jsx("p",{children:"You previously set a password for this wallet. This helps ensure only you can access it"})]})}),e.jsx(s.Actions,{children:e.jsx(Q,{loading:d||!i,disabled:!l,onClick:async()=>{g(!0);let r=await j.getAccessToken(),t=I(b,h);if(!r||!t||l===null)return n("User must be authenticated and have a Privy wallet before it can be recovered");try{x({eventName:"embedded_wallet_recovery_started",payload:{walletAddress:t.address}}),await(i==null?void 0:i.recover({accessToken:r,entropyId:h,entropyIdVerifier:P,recoveryPassword:l})),c(""),w?k(w):v({shouldCallAuthOnSuccess:!1}),u==null||u(t),x({eventName:"embedded_wallet_recovery_completed",payload:{walletAddress:t.address}})}catch(_){W(_)?c("Invalid recovery password, please try again."):c("An error has occurred, please try again.")}finally{g(!1)}},$hideAnimations:!h&&d,children:"Recover your account"})}),e.jsx(s.Watermark,{})]})]})}};let K=p.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`,L=p.div`
  line-height: 20px;
  height: 20px;
  font-size: 13px;
  color: var(--privy-color-error);
  text-align: left;
  margin-top: 0.5rem;
`,Q=p(O)`
  ${({$hideAnimations:o})=>o&&N`
      && {
        // Remove animations because the recoverWallet task on the iframe partially
        // blocks the renderer, so the animation stutters and doesn't look good
        transition: none;
      }
    `}
`;export{te as PasswordRecoveryScreen,te as default};
