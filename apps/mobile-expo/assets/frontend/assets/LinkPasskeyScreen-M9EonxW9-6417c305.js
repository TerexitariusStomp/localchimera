import{aY as e,aV as m,cQ as I,d$ as L,cC as N,cP as A,da as b,ch as g}from"./index-6efb313d.js";import{g as t,at as S,au as P}from"./index-77dae828.js";import{a as M,c as v}from"./TodoList-CgrU7uwu-77894a28.js";import{n as j}from"./ScreenLayout-Ce16-u0i-a78ebf8c.js";import{C as $}from"./circle-check-big-a4e4145e.js";import{F as C}from"./fingerprint-pattern-7c628adf.js";import{c as z}from"./createLucideIcon-9f7c018a.js";import"./check-fbdaa4bc.js";import"./ModalHeader-YbJk-YIQ-63727d18.js";import"./Screen-CdOj1bUg-f0af9018.js";import"./index-Dq_xe9dz-514db2a0.js";/**
 * @license lucide-react v0.554.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U=[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]],W=z("trash-2",U),_=({passkeys:i,name:d,isLoading:y,errorReason:u,success:o,expanded:a,onLinkPasskey:k,onUnlinkPasskey:n,onExpand:r,onBack:s,onClose:c})=>o?e.jsx(j,{title:"Passkeys updated",icon:$,iconVariant:"success",primaryCta:{label:"Done",onClick:c},onClose:c,watermark:!0}):a?e.jsx(j,{icon:C,title:"Your passkeys",onBack:s,onClose:c,watermark:!0,children:e.jsx(E,{passkeys:i,expanded:a,onUnlink:n,onExpand:r})}):e.jsxs(j,{icon:C,title:"Set up passkey verification",subtitle:"Verify with passkey",primaryCta:{label:"Add new passkey",onClick:k,loading:y},onClose:c,watermark:!0,helpText:u||void 0,children:[i.length===0?e.jsx(O,{}):e.jsx(B,{children:e.jsx(E,{passkeys:i,expanded:a,onUnlink:n,onExpand:r})}),d?e.jsxs(T,{children:[e.jsx(V,{children:"New Passkey Name"}),e.jsx(D,{children:d})]}):null]});let B=t.div`
  margin-bottom: 0.75rem;
`,T=t.div`
  margin-top: 0.25rem;
`,V=t.div`
  color: var(--privy-color-foreground-2);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1rem;
  margin-bottom: 0.25rem;
`,D=t.div`
  color: var(--privy-color-foreground);
  font-size: 0.875rem;
  line-height: 1.25rem;
`,E=({passkeys:i,expanded:d,onUnlink:y,onExpand:u})=>{let[o,a]=m.useState([]),k=d?i.length:2;return e.jsxs("div",{children:[e.jsx(G,{children:"Your passkeys"}),e.jsxs(Y,{children:[i.slice(0,k).map(n=>{var s;return e.jsxs(H,{children:[e.jsxs("div",{children:[e.jsx(K,{children:(r=n,r.authenticatorName?r.createdWithBrowser?`${r.authenticatorName} on ${r.createdWithBrowser}`:r.authenticatorName:r.createdWithBrowser?r.createdWithOs?`${r.createdWithBrowser} on ${r.createdWithOs}`:`${r.createdWithBrowser}`:"Unknown device")}),e.jsxs(q,{children:["Last used:"," ",((s=n.latestVerifiedAt??n.firstVerifiedAt)==null?void 0:s.toLocaleString())??"N/A"]})]}),e.jsx(J,{disabled:o.includes(n.credentialId),onClick:()=>(async c=>{a(l=>l.concat([c])),await y(c),a(l=>l.filter(x=>x!==c))})(n.credentialId),children:o.includes(n.credentialId)?e.jsx(S,{}):e.jsx(W,{size:16})})]},n.credentialId);var r}),i.length>2&&!d&&e.jsx(R,{onClick:u,children:"View all"})]})]})},O=()=>e.jsxs(M,{style:{color:"var(--privy-color-foreground)"},children:[e.jsx(v,{children:"Verify with Touch ID, Face ID, PIN, or hardware key"}),e.jsx(v,{children:"Takes seconds to set up and use"}),e.jsx(v,{children:"Use your passkey to verify transactions and login to your account"})]});const de={component:()=>{var w;let{user:i}=I(),{unlink:d}=L(),{linkWithPasskey:y,closePrivyModal:u}=N(),{data:o}=A(),a=i==null?void 0:i.linkedAccounts.filter(p=>p.type==="passkey"),[k,n]=m.useState(!1),[r,s]=m.useState(""),[c,l]=m.useState(!1),[x,f]=m.useState(!1);return m.useEffect(()=>{a.length===0&&f(!1)},[a.length]),e.jsx(_,{passkeys:a,name:(w=o==null?void 0:o.passkeyAuthModalData)==null?void 0:w.name,isLoading:k,errorReason:r,success:c,expanded:x,onLinkPasskey:()=>{var p;n(!0),y({name:(p=o==null?void 0:o.passkeyAuthModalData)==null?void 0:p.name}).then(()=>l(!0)).catch(h=>{if(h instanceof b){if(h.privyErrorCode===g.CANNOT_LINK_MORE_OF_TYPE)return void s("Cannot link more passkeys to account.");if(h.privyErrorCode===g.PASSKEY_NOT_ALLOWED)return void s("Passkey request timed out or rejected by user.")}s("Unknown error occurred.")}).finally(()=>{n(!1)})},onUnlinkPasskey:async p=>(n(!0),await d({credentialId:p}).then(()=>l(!0)).catch(h=>{h instanceof b&&h.privyErrorCode===g.MISSING_MFA_CREDENTIALS?s("Cannot unlink a passkey enrolled in MFA"):s("Unknown error occurred.")}).finally(()=>{n(!1)})),onExpand:()=>f(!0),onBack:()=>f(!1),onClose:()=>u()})}},le=t.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 180px;
  height: 90px;
  border-radius: 50%;
  svg + svg {
    margin-left: 12px;
  }
  > svg {
    z-index: 2;
    color: var(--privy-color-accent) !important;
    stroke: var(--privy-color-accent) !important;
    fill: var(--privy-color-accent) !important;
  }
`;let F=P`
  && {
    width: 100%;
    font-size: 0.875rem;
    line-height: 1rem;

    /* Tablet and Up */
    @media (min-width: 440px) {
      font-size: 14px;
    }

    display: flex;
    gap: 12px;
    justify-content: center;

    padding: 6px 8px;
    background-color: var(--privy-color-background);
    transition: background-color 200ms ease;
    color: var(--privy-color-accent) !important;

    :focus {
      outline: none;
      box-shadow: none;
    }
  }
`;const R=t.button`
  ${F}
`;let Y=t.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.8rem;
  padding: 0.5rem 0rem 0rem;
  flex-grow: 1;
  width: 100%;
`,G=t.div`
  line-height: 20px;
  height: 20px;
  font-size: 1em;
  font-weight: 450;
  display: flex;
  justify-content: flex-beginning;
  width: 100%;
`,K=t.div`
  font-size: 1em;
  line-height: 1.3em;
  font-weight: 500;
  color: var(--privy-color-foreground-2);
  padding: 0.2em 0;
`,q=t.div`
  font-size: 0.875rem;
  line-height: 1rem;
  color: #64668b;
  padding: 0.2em 0;
`,H=t.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1em;
  gap: 10px;
  font-size: 0.875rem;
  line-height: 1rem;
  text-align: left;
  border-radius: 8px;
  border: 1px solid #e2e3f0 !important;
  width: 100%;
  height: 5em;
`,Q=P`
  :focus,
  :hover,
  :active {
    outline: none;
  }
  display: flex;
  width: 2em;
  height: 2em;
  justify-content: center;
  align-items: center;
  svg {
    color: var(--privy-color-error);
  }
  svg:hover {
    color: var(--privy-color-foreground-3);
  }
`,J=t.button`
  ${Q}
`;export{le as DoubleIconWrapper,R as LinkButton,de as LinkPasskeyScreen,_ as LinkPasskeyView,de as default};
