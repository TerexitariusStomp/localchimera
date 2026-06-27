import{cQ as I,cC as W,cP as A,aV as u,aY as e,d9 as w,ee as M}from"./index-ba860db5.js";import{t as R}from"./ExclamationTriangleIcon-7d9ff63b.js";import{i as V}from"./LockClosedIcon-fcdcccec.js";import{T as j,k as S,u as b}from"./ModalHeader-YbJk-YIQ-1ed844bc.js";import{g as F,aQ as k}from"./index-00419ca3.js";import{r as H}from"./Subtitle-CV-2yKE4-4c369387.js";import{e as T}from"./Title-BnzYV3Is-3f1ecb1a.js";const Q=F.div`
  && {
    border-width: 4px;
  }

  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  aspect-ratio: 1;
  border-style: solid;
  border-color: ${i=>i.$color??"var(--privy-color-accent)"};
  border-radius: 50%;
`,z={component:()=>{var p;let{user:i}=I(),{client:$,walletProxy:m,refreshSessionAndUser:C,closePrivyModal:l}=W(),s=A(),{entropyId:f,entropyIdVerifier:E}=((p=s.data)==null?void 0:p.recoverWallet)??{},[n,h]=u.useState(!1),[c,P]=u.useState(null),[d,g]=u.useState(null);function y(){var r,o,t,a;if(!n){if(d)return(o=(r=s.data)==null?void 0:r.setWalletPassword)==null||o.onFailure(d),void l();if(!c)return(a=(t=s.data)==null?void 0:t.setWalletPassword)==null||a.onFailure(Error("User exited set recovery flow")),void l()}}s.onUserCloseViaDialogOrKeybindRef.current=y;let U=!(!n&&!c);return e.jsxs(e.Fragment,d?{children:[e.jsx(j,{onClose:y},"header"),e.jsx(Q,{$color:"var(--privy-color-error)",style:{alignSelf:"center"},children:e.jsx(R,{height:38,width:38,stroke:"var(--privy-color-error)"})}),e.jsx(T,{style:{marginTop:"0.5rem"},children:"Something went wrong"}),e.jsx(k,{style:{minHeight:"2rem"}}),e.jsx(S,{onClick:()=>g(null),children:"Try again"}),e.jsx(b,{})]}:{children:[e.jsx(j,{onClose:y},"header"),e.jsx(V,{style:{width:"3rem",height:"3rem",alignSelf:"center"}}),e.jsx(T,{style:{marginTop:"0.5rem"},children:"Automatically secure your account"}),e.jsx(H,{style:{marginTop:"1rem"},children:"When you log into a new device, you’ll only need to authenticate to access your account. Never get logged out if you forget your password."}),e.jsx(k,{style:{minHeight:"2rem"}}),e.jsx(S,{loading:n,disabled:U,onClick:()=>async function(){h(!0);try{let r=await $.getAccessToken(),o=w(i,f);if(!r||!m||!o)return;if(!(await m.setRecovery({accessToken:r,entropyId:f,entropyIdVerifier:E,existingRecoveryMethod:o.recoveryMethod,recoveryMethod:"privy"})).entropyId)throw Error("Unable to set recovery on wallet");let t=await C();if(!t)throw Error("Unable to set recovery on wallet");let a=w(t,o.address);if(!a)throw Error("Unabled to set recovery on wallet");P(!!t),setTimeout(()=>{var x,v;(v=(x=s.data)==null?void 0:x.setWalletPassword)==null||v.onSuccess(a),l()},M)}catch(r){g(r)}finally{h(!1)}}(),children:c?"Success":"Confirm"}),e.jsx(b,{})]})}};export{z as SetAutomaticRecoveryScreen,z as default};
