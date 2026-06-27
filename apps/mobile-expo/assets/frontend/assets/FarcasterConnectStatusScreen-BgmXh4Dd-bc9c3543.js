import{aY as t,bN as Q,dE as X,cQ as G,cP as Z,aU as ee,cC as re,aV as l,ch as u,ef as te,ee as F}from"./index-6efb313d.js";import{g as n,a2 as ae}from"./index-77dae828.js";import{n as ie}from"./OpenLink-DZHy38vr-edf7f692.js";import{C as oe}from"./QrCode-BxAVhbx2-62079688.js";import{$ as ne}from"./ModalHeader-YbJk-YIQ-63727d18.js";import{r as se}from"./LabelXs-oqZNqbm_-2f3d7392.js";import{a as le}from"./shouldProceedtoEmbeddedWalletCreationFlow-CBt9hKD6-e9fe8338.js";import{n as ce}from"./ScreenLayout-Ce16-u0i-a78ebf8c.js";import{l as _}from"./farcaster-DPlSjvF5-1785148d.js";import"./browser-e933942f.js";import{C as de}from"./check-fbdaa4bc.js";import{C as ue}from"./copy-8ea7b53d.js";import"./Screen-CdOj1bUg-f0af9018.js";import"./index-Dq_xe9dz-514db2a0.js";import"./createLucideIcon-9f7c018a.js";let pe=n.div`
  width: 100%;
`,me=n.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem;
  height: 56px;
  background: ${r=>r.$disabled?"var(--privy-color-background-2)":"var(--privy-color-background)"};
  border: 1px solid var(--privy-color-foreground-4);
  border-radius: var(--privy-border-radius-md);

  &:hover {
    border-color: ${r=>r.$disabled?"var(--privy-color-foreground-4)":"var(--privy-color-foreground-3)"};
  }
`,he=n.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
`,H=n.span`
  display: block;
  font-size: 16px;
  line-height: 24px;
  color: ${r=>r.$disabled?"var(--privy-color-foreground-2)":"var(--privy-color-foreground)"};
  overflow: hidden;
  text-overflow: ellipsis;
  /* Use single-line truncation without nowrap to respect container width */
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  word-break: break-all;

  @media (min-width: 441px) {
    font-size: 14px;
    line-height: 20px;
  }
`,fe=n(H)`
  color: var(--privy-color-foreground-3);
  font-style: italic;
`,ge=n(se)`
  margin-bottom: 0.5rem;
`,ve=n(ne)`
  && {
    gap: 0.375rem;
    font-size: 14px;
    flex-shrink: 0;
  }
`;const xe=({value:r,title:p,placeholder:c,className:a,showCopyButton:d=!0,truncate:o,maxLength:m=40,disabled:h=!1})=>{let[s,x]=l.useState(!1),E=o&&r?((i,S,f)=>{if((i=i.startsWith("https://")?i.slice(8):i).length<=f)return i;if(S==="middle"){let y=Math.ceil(f/2)-2,C=Math.floor(f/2)-1;return`${i.slice(0,y)}...${i.slice(-C)}`}return`${i.slice(0,f-3)}...`})(r,o,m):r;return l.useEffect(()=>{if(s){let i=setTimeout(()=>x(!1),3e3);return()=>clearTimeout(i)}},[s]),t.jsxs(pe,{className:a,children:[p&&t.jsx(ge,{children:p}),t.jsxs(me,{$disabled:h,children:[t.jsx(he,{children:r?t.jsx(H,{$disabled:h,title:r,children:E}):t.jsx(fe,{$disabled:h,children:c||"No value"})}),d&&r&&t.jsx(ve,{onClick:function(i){i.stopPropagation(),navigator.clipboard.writeText(r).then(()=>x(!0)).catch(console.error)},size:"sm",children:t.jsxs(t.Fragment,s?{children:["Copied",t.jsx(de,{size:14})]}:{children:["Copy",t.jsx(ue,{size:14})]})})]})]})},ye=({connectUri:r,loading:p,success:c,errorMessage:a,onBack:d,onClose:o,onOpenFarcaster:m})=>t.jsx(ce,Q||p?X?{title:a?a.message:"Sign in with Farcaster",subtitle:a?a.detail:"To sign in with Farcaster, please open the Farcaster app.",icon:_,iconVariant:"loading",iconLoadingStatus:{success:c,fail:!!a},primaryCta:r&&m?{label:"Open Farcaster app",onClick:m}:void 0,onBack:d,onClose:o,watermark:!0}:{title:a?a.message:"Signing in with Farcaster",subtitle:a?a.detail:"This should only take a moment",icon:_,iconVariant:"loading",iconLoadingStatus:{success:c,fail:!!a},onBack:d,onClose:o,watermark:!0,children:r&&Q&&t.jsx(be,{children:t.jsx(ie,{text:"Take me to Farcaster",url:r,color:"#8a63d2"})})}:{title:"Sign in with Farcaster",subtitle:"Scan with your phone's camera to continue.",onBack:d,onClose:o,watermark:!0,children:t.jsxs(we,{children:[t.jsx(Ee,{children:r?t.jsx(oe,{url:r,size:275,squareLogoElement:_}):t.jsx(Te,{children:t.jsx(ae,{})})}),t.jsxs(Se,{children:[t.jsx(Ce,{children:"Or copy this link and paste it into a phone browser to open the Farcaster app."}),r&&t.jsx(xe,{value:r,truncate:"end",maxLength:30,showCopyButton:!0,disabled:!0})]})]})}),We={component:()=>{let{authenticated:r,logout:p,ready:c,user:a}=G(),{lastScreen:d,navigate:o,navigateBack:m,setModalData:h}=Z(),s=ee(),{getAuthFlow:x,loginWithFarcaster:E,closePrivyModal:i,createAnalyticsEvent:S}=re(),[f,y]=l.useState(void 0),[C,Y]=l.useState(!1),[b,J]=l.useState(!1),T=l.useRef([]),w=x(),k=w==null?void 0:w.meta.connectUri;return l.useEffect(()=>{let g=Date.now(),j=setInterval(async()=>{var O,R,$,N,I,L,U,D,M,z,W,B,P,V,q;let A=await w.pollForReady.execute(),K=Date.now()-g;if(A){clearInterval(j),Y(!0);try{await E(),J(!0)}catch(e){let v={retryable:!1,message:"Authentication failed"};if((e==null?void 0:e.privyErrorCode)===u.ALLOWLIST_REJECTED)return void o("AllowlistRejectionScreen");if((e==null?void 0:e.privyErrorCode)===u.USER_LIMIT_REACHED)return console.error(new te(e).toString()),void o("UserLimitReachedScreen");if((e==null?void 0:e.privyErrorCode)===u.USER_DOES_NOT_EXIST)return void o("AccountNotFoundScreen");if((e==null?void 0:e.privyErrorCode)===u.LINKED_TO_ANOTHER_USER)v.detail=e.message??"This account has already been linked to another user.";else{if((e==null?void 0:e.privyErrorCode)===u.ACCOUNT_TRANSFER_REQUIRED&&((R=(O=e.data)==null?void 0:O.data)!=null&&R.nonce))return h({accountTransfer:{nonce:(N=($=e.data)==null?void 0:$.data)==null?void 0:N.nonce,account:(L=(I=e.data)==null?void 0:I.data)==null?void 0:L.subject,displayName:(M=(D=(U=e.data)==null?void 0:U.data)==null?void 0:D.account)==null?void 0:M.displayName,linkMethod:"farcaster",embeddedWalletAddress:(B=(W=(z=e.data)==null?void 0:z.data)==null?void 0:W.otherUser)==null?void 0:B.embeddedWalletAddress,farcasterEmbeddedAddress:(q=(V=(P=e.data)==null?void 0:P.data)==null?void 0:V.otherUser)==null?void 0:q.farcasterEmbeddedAddress}}),void o("LinkConflictScreen");(e==null?void 0:e.privyErrorCode)===u.INVALID_CREDENTIALS?(v.retryable=!0,v.detail="Something went wrong. Try again."):(e==null?void 0:e.privyErrorCode)===u.TOO_MANY_REQUESTS&&(v.detail="Too many requests. Please wait before trying again.")}y(v)}}else K>12e4&&(clearInterval(j),y({retryable:!0,message:"Authentication failed",detail:"The request timed out. Try again."}))},2e3);return()=>{clearInterval(j),T.current.forEach(A=>clearTimeout(A))}},[]),l.useEffect(()=>{if(c&&r&&b&&a){if(s!=null&&s.legal.requireUsersAcceptTerms&&!a.hasAcceptedTerms){let g=setTimeout(()=>{o("AffirmativeConsentScreen")},F);return()=>clearTimeout(g)}b&&(le(a,s.embeddedWallets)?T.current.push(setTimeout(()=>{h({createWallet:{onSuccess:()=>{},onFailure:g=>{console.error(g),S({eventName:"embedded_wallet_creation_failure_logout",payload:{error:g,screen:"FarcasterConnectStatusScreen"}}),p()},callAuthOnSuccessOnClose:!0}}),o("EmbeddedWalletOnAccountCreateScreen")},F)):T.current.push(setTimeout(()=>i({shouldCallAuthOnSuccess:!0,isSuccess:!0}),F)))}},[b,c,r,a]),t.jsx(ye,{connectUri:k,loading:C,success:b,errorMessage:f,onBack:d?m:void 0,onClose:i,onOpenFarcaster:()=>{k&&(window.location.href=k)}})}};let be=n.div`
  margin-top: 24px;
`,we=n.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
`,Ee=n.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 275px;
`,Se=n.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`,Ce=n.div`
  font-size: 0.875rem;
  text-align: center;
  color: var(--privy-color-foreground-2);
`,Te=n.div`
  position: relative;
  width: 82px;
  height: 82px;
`;export{We as FarcasterConnectStatusScreen,ye as FarcasterConnectStatusView,We as default};
