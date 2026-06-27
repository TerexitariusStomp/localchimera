import{cQ as F,cP as z,aV as f,eJ as D,aY as t,bN as V}from"./index-6efb313d.js";import{g as w,b3 as Y}from"./index-77dae828.js";import{p as M}from"./CopyableText-ChtfBWx4-1eadf104.js";import{n as C}from"./ScreenLayout-Ce16-u0i-a78ebf8c.js";import{i as R}from"./InfoBanner-DkQEPd77-5e9364b8.js";import{y as q,c as H,p as N}from"./SelectSourceAsset-BSIZrvmo-66f3d234.js";import{r as E}from"./chevron-down-af197e6c.js";import{C as U}from"./circle-x-d5b04772.js";import{H as K}from"./hourglass-7b5c5d37.js";import{c as O}from"./createLucideIcon-9f7c018a.js";import{C as J}from"./check-fbdaa4bc.js";import"./copy-8ea7b53d.js";import"./ModalHeader-YbJk-YIQ-63727d18.js";import"./Screen-CdOj1bUg-f0af9018.js";import"./index-Dq_xe9dz-514db2a0.js";/**
 * @license lucide-react v0.554.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q=[["path",{d:"m16 11 2 2 4-4",key:"9rsbq5"}],["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],X=O("user-check",Q),G=e=>{try{return e.location.origin}catch{return}},Z=({data:e,onClose:a})=>t.jsx(C,{showClose:!0,onClose:a,title:"Initiate bank transfer",subtitle:"Use the details below to complete a bank transfer from your bank.",primaryCta:{label:"Done",onClick:a},watermark:!1,footerText:"Exchange rates and fees are set when you authorize and determine the amount you receive. You'll see the applicable rates and fees for your transaction separately",children:t.jsx(ee,{children:(Y[e.deposit_instructions.asset]||[]).map(([u,y],g)=>{let d=e.deposit_instructions[u];if(!d||Array.isArray(d))return null;let o=u==="asset"?d.toUpperCase():d,h=o.length>100?`${o.slice(0,9)}...${o.slice(-9)}`:o;return t.jsxs(te,{children:[t.jsx(se,{children:y}),t.jsx(M,{value:o,includeChildren:V,children:t.jsx(re,{children:h})})]},g)})})});let ee=w.ol`
  border-color: var(--privy-color-border-default);
  border-width: 1px;
  border-radius: var(--privy-border-radius-mdlg);
  border-style: solid;
  display: flex;
  flex-direction: column;

  && {
    padding: 0 1rem;
  }
`,te=w.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;

  &:not(:first-of-type) {
    border-top: 1px solid var(--privy-color-border-default);
  }

  & > {
    :nth-child(1) {
      flex-basis: 30%;
    }

    :nth-child(2) {
      flex-basis: 60%;
    }
  }
`,se=w.span`
  color: var(--privy-color-foreground);
  font-kerning: none;
  font-variant-numeric: lining-nums proportional-nums;
  font-feature-settings: 'calt' off;

  /* text-xs/font-regular */
  font-size: 0.75rem;
  font-style: normal;
  font-weight: 400;
  line-height: 1.125rem; /* 150% */

  text-align: left;
  flex-shrink: 0;
`,re=w.span`
  color: var(--privy-color-foreground);
  font-kerning: none;
  font-feature-settings: 'calt' off;

  /* text-sm/font-medium */
  font-size: 0.875rem;
  font-style: normal;
  font-weight: 500;
  line-height: 1.375rem; /* 157.143% */

  text-align: right;
  word-break: break-all;
`;const oe=({onClose:e})=>t.jsx(C,{showClose:!0,onClose:e,icon:U,iconVariant:"error",title:"Something went wrong",subtitle:"We couldn't complete account setup. This isn't caused by anything you did.",primaryCta:{label:"Close",onClick:e},watermark:!0}),ae=({onClose:e,reason:a})=>{let u=a?a.charAt(0).toLowerCase()+a.slice(1):void 0;return t.jsx(C,{showClose:!0,onClose:e,icon:U,iconVariant:"error",title:"Identity verification failed",subtitle:u?`We can't complete identity verification because ${u}. Please try again or contact support for assistance.`:"We couldn't verify your identity. Please try again or contact support for assistance.",primaryCta:{label:"Close",onClick:e},watermark:!0})},ie=({onClose:e,email:a})=>t.jsx(C,{showClose:!0,onClose:e,icon:K,title:"Identity verification in progress",subtitle:"We're waiting for Persona to approve your identity verification. This usually takes a few minutes, but may take up to 24 hours.",primaryCta:{label:"Done",onClick:e},watermark:!0,children:t.jsxs(R,{theme:"light",children:["You'll receive an email at ",a," once approved with instructions for completing your deposit."]})}),ne=({onClose:e,onAcceptTerms:a,isLoading:u})=>t.jsx(C,{showClose:!0,onClose:e,icon:X,title:"Verify your identity to continue",subtitle:"Finish verification with Persona — it takes just a few minutes and requires a government ID.",helpText:t.jsxs(t.Fragment,{children:[`This app uses Bridge to securely connect accounts and move funds. By clicking "Accept," you agree to Bridge's`," ",t.jsx("a",{href:"https://www.bridge.xyz/legal",target:"_blank",rel:"noopener noreferrer",children:"Terms of Service"})," ","and"," ",t.jsx("a",{href:"https://www.bridge.xyz/legal/row-privacy-policy/bridge-building-limited",target:"_blank",rel:"noopener noreferrer",children:"Privacy Policy"}),"."]}),primaryCta:{label:"Accept and continue",onClick:a,loading:u},watermark:!0}),ce=({onClose:e})=>t.jsx(C,{showClose:!0,onClose:e,icon:J,iconVariant:"success",title:"Identity verified successfully",subtitle:"We've successfully verified your identity. Now initiate a bank transfer to view instructions.",primaryCta:{label:"Initiate bank transfer",onClick:()=>{},loading:!0},watermark:!0}),le=({opts:e,onClose:a,onEditSourceAsset:u,onSelectAmount:y,isLoading:g})=>t.jsxs(C,{showClose:!0,onClose:a,headerTitle:`Buy ${e.destination.asset.toLocaleUpperCase()}`,primaryCta:{label:"Continue",onClick:y,loading:g},watermark:!0,children:[t.jsx(H,{currency:e.source.selectedAsset,inputMode:"decimal",autoFocus:!0}),t.jsx(N,{selectedAsset:e.source.selectedAsset,onEditSourceAsset:u})]}),ue=({onClose:e,onAcceptTerms:a,onSelectAmount:u,onSelectSource:y,onEditSourceAsset:g,opts:d,state:o,email:h,isLoading:n})=>o.status==="select-amount"?t.jsx(le,{onClose:e,onSelectAmount:u,onEditSourceAsset:g,opts:d,isLoading:n}):o.status==="select-source-asset"?t.jsx(q,{onSelectSource:y,opts:d,isLoading:n}):o.status==="kyc-prompt"?t.jsx(ne,{onClose:e,onAcceptTerms:a,opts:d,isLoading:n}):o.status==="kyc-incomplete"?t.jsx(ie,{onClose:e,email:h}):o.status==="kyc-success"?t.jsx(ce,{onClose:e}):o.status==="kyc-error"?t.jsx(ae,{onClose:e,reason:o.reason}):o.status==="account-details"?t.jsx(Z,{onClose:e,data:o.data}):o.status==="create-customer-error"||o.status==="get-customer-error"?t.jsx(oe,{onClose:e}):null,Se={component:()=>{let{user:e}=F(),a=z().data;if(!(a!=null&&a.FundWithBankDepositScreen))throw Error("Missing data");let{onSuccess:u,onFailure:y,opts:g,createOrUpdateCustomer:d,getCustomer:o,getOrCreateVirtualAccount:h}=a.FundWithBankDepositScreen,[n,A]=f.useState(g),[v,r]=f.useState({status:"select-amount"}),[x,c]=f.useState(null),[_,i]=f.useState(!1),k=f.useRef(null),T=f.useCallback(async()=>{var b,m;let s;i(!0),c(null);try{s=await o({kycRedirectUrl:window.location.origin})}catch(l){if(!l||typeof l!="object"||!("status"in l)||l.status!==404)return r({status:"get-customer-error"}),c(l),void i(!1)}if(!s)try{s=await d({hasAcceptedTerms:!1,kycRedirectUrl:window.location.origin})}catch(l){return r({status:"create-customer-error"}),c(l),void i(!1)}if(!s)return r({status:"create-customer-error"}),c(Error("Unable to create customer")),void i(!1);if(s.status==="not_started"&&s.kyc_url)return r({status:"kyc-prompt",kycUrl:s.kyc_url}),void i(!1);if(s.status==="not_started")return r({status:"get-customer-error"}),c(Error("Unexpected user state")),void i(!1);if(s.status==="rejected")return r({status:"kyc-error",reason:(m=(b=s.rejection_reasons)==null?void 0:b[0])==null?void 0:m.reason}),c(Error("User KYC rejected.")),void i(!1);if(s.status==="incomplete")return r({status:"kyc-incomplete"}),void i(!1);if(s.status!=="active")return r({status:"get-customer-error"}),c(Error("Unexpected user state")),void i(!1);s.status;try{let l=await h({destination:n.destination,provider:n.provider,source:{asset:n.source.selectedAsset}});r({status:"account-details",data:l})}catch(l){return r({status:"create-customer-error"}),c(l),void i(!1)}},[n]),L=f.useCallback(async()=>{var l,S;if(c(null),i(!0),v.status!=="kyc-prompt")return c(Error("Unexpected state")),void i(!1);let s=D({location:v.kycUrl});if(await d({hasAcceptedTerms:!0}),!s)return c(Error("Unable to begin kyc flow.")),i(!1),void r({status:"create-customer-error"});k.current=new AbortController;let b=await(async(p,W)=>{let j=await E({operation:async()=>({done:G(p)===window.location.origin,closed:p.closed}),until:({done:B,closed:P})=>B||P,delay:0,interval:500,attempts:360,signal:W});return j.status==="aborted"?(p.close(),{status:"aborted"}):j.status==="max_attempts"?{status:"timeout"}:j.result.done?(p.close(),{status:"redirected"}):{status:"closed"}})(s,k.current.signal);if(b.status==="aborted")return;if(b.status==="closed")return void i(!1);b.status;let m=await E({operation:()=>o({}),until:p=>p.status==="active"||p.status==="rejected",delay:0,interval:2e3,attempts:60,signal:k.current.signal});if(m.status!=="aborted"){if(m.status==="max_attempts")return r({status:"kyc-incomplete"}),void i(!1);if(m.status,m.result.status==="rejected")return r({status:"kyc-error",reason:(S=(l=m.result.rejection_reasons)==null?void 0:l[0])==null?void 0:S.reason}),c(Error("User KYC rejected.")),void i(!1);if(m.result.status!=="active")return r({status:"kyc-incomplete"}),void i(!1);s.closed||s.close(),m.result.status;try{r({status:"kyc-success"});let p=await h({destination:n.destination,provider:n.provider,source:{asset:n.source.selectedAsset}});r({status:"account-details",data:p})}catch(p){r({status:"create-customer-error"}),c(p)}finally{i(!1)}}},[r,c,i,d,h,v,n,k]),$=f.useCallback(s=>{r({status:"select-amount"}),A({...n,source:{...n.source,selectedAsset:s}})},[r,A]),I=f.useCallback(()=>{r({status:"select-source-asset"})},[r]);return t.jsx(ue,{onClose:f.useCallback(async()=>{var s;(s=k.current)==null||s.abort(),x?y(x):await u()},[x,k]),opts:n,state:v,isLoading:_,email:e.email.address,onAcceptTerms:L,onSelectAmount:T,onSelectSource:$,onEditSourceAsset:I})}};export{Se as FundWithBankDepositScreen,Se as default};
