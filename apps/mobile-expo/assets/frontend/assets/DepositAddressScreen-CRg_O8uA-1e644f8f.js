import{eo as de,cP as ce,aV as p,aY as r,cC as _,e5 as ue}from"./index-6efb313d.js";import{ac as H,ad as D,ae as me,af as pe,g as d,ag as Y,ah as g,a2 as Q,ai as C,aj as he}from"./index-77dae828.js";import{n as w}from"./ScreenLayout-Ce16-u0i-a78ebf8c.js";import{n as X}from"./styles-DVyDvTdj-f910f5fb.js";import{m as fe}from"./ModalHeader-YbJk-YIQ-63727d18.js";import{C as ge}from"./QrCode-BxAVhbx2-62079688.js";import{u as ye,e as be,g as ve,h as xe,d as Ce,j as we,k as ke,l as _e,m as Ee,F as Te,b as je,o as Ne,f as Se,s as Ue}from"./floating-ui.react-60c51fae.js";import{m as Ae}from"./CopyableText-ChtfBWx4-1eadf104.js";import"./browser-e933942f.js";import{T as R}from"./triangle-alert-a4595016.js";import{c as O}from"./createLucideIcon-9f7c018a.js";import{r as K,C as Ie}from"./chevron-down-af197e6c.js";import{C as F}from"./check-fbdaa4bc.js";import{H as De}from"./hourglass-7b5c5d37.js";import{I as Re}from"./info-11f752cd.js";import"./Screen-CdOj1bUg-f0af9018.js";import"./index-Dq_xe9dz-514db2a0.js";import"./copy-8ea7b53d.js";function P(e){return e.startsWith("eip155:")?"ethereum":e.startsWith("solana:")?"solana":e.startsWith("bip122:")?"bitcoin-segwit":e.startsWith("tron:")?"tron":void 0}async function G(e){var i;let{user:t}=await e.privy.user.get();if(!t)return{ok:!1,error:"NOT_AUTHENTICATED"};let o=function(c,l){let u=P(c);if(!u)return;let s=l.linked_accounts.find(a=>a.type==="wallet"&&a.chain_type===u&&"address"in a&&a.address);return s&&"address"in s?s.address:void 0}(e.caip2,t);if(o)return{ok:!0,address:o};let n=P(e.caip2);if(!n)return{ok:!1,error:"UNSUPPORTED_CHAIN"};try{let c=await e.privy.fetchPrivyRoute(de,{body:{chain_type:n}});return await((i=e.onWalletCreated)==null?void 0:i.call(e)),{ok:!0,address:c.address}}catch{return{ok:!1,error:"REFUND_WALLET_CREATION_FAILED"}}}async function Oe(e){let{user:t}=await e.privy.user.get();if(!t)throw Error("NOT_AUTHENTICATED");let o=e.refundAddress;if(!o){let n=await G({privy:e.privy,caip2:e.sourceChain,onWalletCreated:e.onWalletCreated});if(!n.ok)throw Error(n.error);o=n.address}return await e.privy.fetchPrivyRoute(H,{body:{source_chain:e.sourceChain,source_currency:e.sourceCurrency,destination_chain:e.destinationChain,destination_currency:e.destinationCurrency,destination_address:e.destinationAddress,refund_address:o,...e.slippageBps!=null?{slippage_bps:e.slippageBps}:{}}})}function J(e,t){return Math.ceil(t/e)}function Z(e){return e.status==="success"?e.result?{status:"success",order:e.result}:{status:"timeout"}:e.status==="aborted"?{status:"aborted",error:e.error}:{status:"timeout",error:e.error}}async function Fe(e){return await e.privy.fetchPrivyRoute(D,{params:{order_id:e.orderId}})}async function $e(e){let t=e.pollIntervalMs??2e3,o=e.timeoutMs??18e5,n=e.signal??new AbortController().signal;return Z(await K({operation:async()=>{let i=await e.privy.fetchPrivyRoute(me,{params:{deposit_address_id:e.depositAddressId},query:{after:e.quoteCreatedAt}});if(i.order)return await e.privy.fetchPrivyRoute(D,{params:{order_id:i.order.id}})},until:i=>i!==void 0,delay:t,interval:t,attempts:J(t,o),signal:n}))}async function Pe(e){let t=e.pollIntervalMs??2e3,o=e.timeoutMs??18e5,n=e.signal??new AbortController().signal;return Z(await K({operation:()=>e.privy.fetchPrivyRoute(D,{params:{order_id:e.orderId}}),until:i=>i.status!=="executing",delay:t,interval:t,attempts:J(t,o),signal:n}))}async function Le(e){let t=await e.fetchPrivyRoute(pe,{});return{currencies:t.currencies,chains:t.chains}}var $=Object.freeze({__proto__:null,generateDepositAddress:Oe,getConfig:Le,getDeposit:Fe,resolveRefundAddress:G,waitForCompletion:Pe,waitForDeposit:$e});/**
 * @license lucide-react v0.554.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Me=[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]],ze=O("chevron-up",Me);/**
 * @license lucide-react v0.554.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ve=[["rect",{width:"5",height:"5",x:"3",y:"3",rx:"1",key:"1tu5fj"}],["rect",{width:"5",height:"5",x:"16",y:"3",rx:"1",key:"1v8r4q"}],["rect",{width:"5",height:"5",x:"3",y:"16",rx:"1",key:"1x03jg"}],["path",{d:"M21 16h-3a2 2 0 0 0-2 2v3",key:"177gqh"}],["path",{d:"M21 21v.01",key:"ents32"}],["path",{d:"M12 7v3a2 2 0 0 1-2 2H7",key:"8crl2c"}],["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M12 3h.01",key:"n36tog"}],["path",{d:"M12 16v.01",key:"133mhm"}],["path",{d:"M16 12h1",key:"1slzba"}],["path",{d:"M21 12v.01",key:"1lwtk9"}],["path",{d:"M12 21v-1",key:"1880an"}]],ee=O("qr-code",Ve);/**
 * @license lucide-react v0.554.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const We=[["path",{d:"M9 14 4 9l5-5",key:"102s5s"}],["path",{d:"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11",key:"f3b9sd"}]],Be=O("undo-2",We);class qe extends p.Component{static getDerivedStateFromError(){return{hasError:!0}}componentDidCatch(t,o){this.props.onError(t)}componentDidUpdate(t){t.resetKey!==this.props.resetKey&&this.state.hasError&&this.setState({hasError:!1})}render(){return this.state.hasError?null:this.props.children}constructor(...t){super(...t),this.state={hasError:!1}}}function He(e,t,o){let n=Number(e);return!Number.isFinite(n)||n===0?`1 ${t} ≈ ${e} ${o}`:n>=.01?`1 ${t} ≈ ${L(n)} ${o}`:`${L(1/n)} ${t} ≈ 1 ${o}`}function L(e){return e>=1e3?new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(Math.round(e)):e>=100?new Intl.NumberFormat("en-US",{maximumFractionDigits:1}).format(e):e>=1?new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(e):new Intl.NumberFormat("en-US",{maximumFractionDigits:4}).format(e)}function M(e,t){let o=Number(e);if(!Number.isFinite(o)||o===0)return e;let n=t!=null?o/10**t:o;return n>=1e3?new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(n):n>=1?new Intl.NumberFormat("en-US",{maximumFractionDigits:4}).format(n):n>=1e-4?new Intl.NumberFormat("en-US",{maximumFractionDigits:6}).format(n):new Intl.NumberFormat("en-US",{maximumSignificantDigits:4}).format(n)}function I({address:e,caip2:t,config:o}){for(let n of o.currencies){let i=n.chains.find(c=>c.caip2===t&&c.address.toLowerCase()===e.toLowerCase());if(i)return{symbol:n.symbol.toUpperCase(),decimals:i.decimals}}return{symbol:e,decimals:void 0}}function z(e,t){var o;return((o=t[e])==null?void 0:o.displayName)??e}function V(e,t){if(!e.chains[t.destinationChain])return`Unsupported destination chain: "${t.destinationChain}". Check that the chain is in CAIP-2 format (e.g. "eip155:8453") and is supported for deposit addresses.`;let o=t.destinationCurrency.toLowerCase();return e.currencies.some(n=>n.chains.some(i=>i.caip2===t.destinationChain&&i.address.toLowerCase()===o))?null:`Unsupported destination currency "${t.destinationCurrency}" on chain "${t.destinationChain}". Check that this token address is supported on the specified chain.`}let Ye=new Set(["ROUTE_UNAVAILABLE","UNEXPECTED_STATE","TIMEOUT_WAITING_FOR_NEXT_ORDER","TIMEOUT_ORDER_COMPLETION","DEPOSIT_FAILED","DEPOSIT_REFUNDED","USER_EXITED","AMOUNT_TOO_LOW","INSUFFICIENT_LIQUIDITY","UNSUPPORTED_CHAIN","UNSUPPORTED_CURRENCY","UNSUPPORTED_ROUTE","NO_SWAP_ROUTES_FOUND","NO_INTERNAL_SWAP_ROUTES_FOUND","NO_QUOTES","SANCTIONED_WALLET_ADDRESS","REFUND_WALLET_CREATION_FAILED","DEPOSIT_ADDRESSES_NOT_ENABLED","NOT_AUTHENTICATED"]);function Qe(e){return Ye.has(e)}function W(e){return Qe(e)?e:"UNKNOWN_ERROR"}function re(){let{params:e,setModalState:t}=g(),{privy:o}=_(),n=function(){let{privy:l,refreshSessionAndUser:u}=_();return p.useCallback((s,a)=>a?Promise.resolve({ok:!0,address:a}):$.resolveRefundAddress({privy:l,caip2:s,onWalletCreated:u}),[l,u])}(),[i,c]=p.useState(!1);return{fetchQuote:p.useCallback(async(l,u,s)=>{if(e){c(!0);try{let a=await n(l.caip2,e.refundAddress);if(!a.ok)return void t({step:"error",code:W(a.error)});let m=await o.fetchPrivyRoute(H,{body:{source_chain:l.caip2,source_currency:l.currencyAddress,destination_chain:e.destinationChain,destination_currency:e.destinationCurrency,destination_address:e.destinationAddress,refund_address:a.address,...e.slippageBps!=null?{slippage_bps:e.slippageBps}:{}}});t({step:"address",selectedCurrency:u,selectedChain:l,availableChains:s,quote:m})}catch(a){let m=a instanceof Error?a:Error(String(a)),h="status"in m&&typeof m.status=="number"?m.status:void 0;t({step:"error",code:m instanceof he&&m.code==="feature_not_enabled"?"DEPOSIT_ADDRESSES_NOT_ENABLED":h&&h>=500?"UNKNOWN_ERROR":W(m.message),message:m.message})}finally{c(!1)}}},[e,o,n,t]),isFetching:i}}function te(e,t){switch(e.status){case"completed":return t({step:"complete",order:e});case"refunded":return t({step:"refunded",order:e});case"failed":return t({step:"failed",order:e});case"executing":return t({step:"processing",order:e});default:return}}const E=d(w)`
  #privy-content-footer-container {
    margin-top: 0;
  }
`,Xe=d.p`
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.375rem;
  color: var(--privy-color-foreground-3);
  margin: 0.25rem 0 0;
`,oe=d.img`
  width: 2rem;
  height: 2rem;
  border-radius: var(--privy-border-radius-full);
  object-fit: cover;
  flex-shrink: 0;
`,ne=d.img`
  width: 2rem;
  height: 2rem;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
`,ie=d.span`
  font-weight: 500;
`,Ke=d.span`
  font-size: 0.875rem;
  color: var(--privy-color-foreground-3);
  margin-left: auto;
`;d.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  min-height: 2.25rem;
  border-radius: 6.25rem;
  border: none;
  background-color: var(--privy-color-background-2);

  input {
    flex: 1;
    border: none;
    outline: none;
    box-shadow: none;
    font-size: 0.875rem;
    line-height: 1.25rem;
    background: transparent;
    color: var(--privy-color-foreground);

    &:focus {
      outline: none;
      box-shadow: none;
    }

    &::placeholder {
      color: var(--privy-color-foreground-3);
    }
  }
`;const se=d.button`
  && {
    position: relative;
    width: 100%;
    display: flex;
    gap: 0.75rem;
    align-items: center;
    padding: 0.625rem 0.75rem;
    min-height: 3.5rem;
    border: 1px solid
      ${e=>e.$selected?"var(--privy-color-icon-interactive)":"var(--privy-color-foreground-4)"};
    border-radius: var(--privy-border-radius-md);
    background-color: ${e=>e.$selected?"var(--privy-color-info-bg)":"transparent"};
    color: var(--privy-color-foreground);
    font-size: 0.875rem;
    line-height: 1.5rem;
    cursor: pointer;
    outline: none;
    box-shadow: none;
    transition:
      background-color 200ms ease,
      border-color 200ms ease;

    &:hover {
      background-color: var(--privy-color-background-2);
    }

    &:disabled {
      opacity: ${e=>e.$selected?1:.5};
      cursor: not-allowed;
    }

    &:focus,
    &:focus-visible {
      outline: none;
      box-shadow: none;
    }
  }
`,B=d.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 3rem 0;
`,Ge=d.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0.5rem 0;
`,T=d.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`,j=d.div`
  width: 1.5rem;
  height: 1.5rem;
  border-radius: var(--privy-border-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background-color: ${e=>e.$status==="done"?"var(--privy-color-success-light, #DCFCE7)":"var(--privy-color-background-2)"};
`,q=d.div`
  width: 2px;
  height: 1rem;
  background-color: var(--privy-color-background-2);
  margin-left: 0.6875rem;
`,N=d.span`
  font-size: 0.875rem;
  color: var(--privy-color-foreground);
`;d.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--privy-border-radius-md);
  background-color: var(--privy-color-background-2);
  font-size: 0.8125rem;
  line-height: 1.25rem;
  color: var(--privy-color-foreground-3);
`;const S=d.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8125rem;
  line-height: 1.25rem;
`,U=d.span`
  color: var(--privy-color-foreground);
  font-weight: 400;
`,A=d.span`
  color: var(--privy-color-foreground);
  font-weight: 500;
  text-align: right;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`,ae=d(Q)`
  && {
    margin-left: auto;
    height: 1.5rem;
    width: 1.5rem;
    border-width: 2px;
    flex-shrink: 0;
  }
`,Je=({sourceAmount:e,sourceSymbol:t,sourceChainName:o,sourceDecimals:n,destinationAmount:i,destSymbol:c,destChainName:l,destDecimals:u,onClose:s})=>r.jsx(E,{icon:F,iconVariant:"success",title:"Transfer complete",subtitle:i?`Received ${M(e,n)} ${t} on ${o} and converted it to ${M(i,u)} ${c} on ${l}. Funds are available to use.`:`Your ${t} has been received and is now available in your wallet.`,showClose:!0,onClose:s,primaryCta:{label:"Done",onClick:s},watermark:!1});function Ze(){let{state:e,configData:t,close:o}=C("complete"),{order:n}=e,{sourceSymbol:i,sourceChainName:c,sourceDecimals:l,destSymbol:u,destChainName:s,destDecimals:a}=p.useMemo(()=>{let m=I({address:n.source_currency,caip2:n.source_chain,config:t}),h=I({address:n.destination_currency,caip2:n.destination_chain,config:t});return{sourceSymbol:m.symbol,sourceChainName:z(n.source_chain,t.chains),sourceDecimals:m.decimals,destSymbol:h.symbol,destChainName:z(n.destination_chain,t.chains),destDecimals:h.decimals}},[n,t]);return r.jsx(Je,{sourceAmount:n.source_amount,sourceSymbol:i,sourceChainName:c,sourceDecimals:l,destinationAmount:n.destination_amount,destSymbol:u,destChainName:s,destDecimals:a,onClose:o})}function er(){let{modalState:e,setModalState:t,config:o,retryConfig:n,close:i}=g();if(e.step!=="error")throw Error("UNEXPECTED_STATE");let{code:c}=e,{title:l,subtitle:u,detail:s,iconVariant:a}=(y=>{switch(y){case"AMOUNT_TOO_LOW":return{title:"Amount too low",subtitle:"The deposit amount is below the minimum for this route.",detail:"Try a larger amount or a different token.",iconVariant:"warning"};case"INSUFFICIENT_LIQUIDITY":return{title:"Insufficient liquidity",subtitle:"There isn't enough liquidity for this route right now.",detail:"Try a smaller amount or a different network.",iconVariant:"warning"};case"UNSUPPORTED_CHAIN":return{title:"Unsupported chain",subtitle:"Deposits from this chain type aren't supported yet. Try a different network.",iconVariant:"warning"};case"UNSUPPORTED_CURRENCY":case"UNSUPPORTED_ROUTE":case"ROUTE_UNAVAILABLE":case"NO_SWAP_ROUTES_FOUND":case"NO_INTERNAL_SWAP_ROUTES_FOUND":case"NO_QUOTES":return{title:"Route not available",subtitle:"This deposit route isn't supported right now. Try a different token or network.",iconVariant:"warning"};case"SANCTIONED_WALLET_ADDRESS":return{title:"Address restricted",subtitle:"This address cannot be used for deposits due to compliance restrictions.",iconVariant:"warning"};case"REFUND_WALLET_CREATION_FAILED":return{title:"Unable to set up refund address",subtitle:"We couldn't create a wallet to receive refunds on this chain. Please try again or select a different network.",iconVariant:"warning"};case"DEPOSIT_ADDRESSES_NOT_ENABLED":return{title:"Not enabled",subtitle:"Deposit addresses are not enabled for this app.",iconVariant:"warning"};case"NOT_AUTHENTICATED":return{title:"Not signed in",subtitle:"Please sign in to continue with your deposit.",iconVariant:"warning"};case"TIMEOUT_WAITING_FOR_NEXT_ORDER":case"TIMEOUT_ORDER_COMPLETION":return{title:"Taking longer than expected",subtitle:"Your funds are safe. The deposit is still being processed — check back later.",iconVariant:"subtle"};default:return{title:"Something went wrong",subtitle:"We couldn't complete your request. Please try again.",iconVariant:"subtle"}}})(c),[m,h]=p.useState(!1);return r.jsx(E,{icon:R,iconVariant:a,title:l,subtitle:s?`${u} ${s}`:u,showClose:!0,onClose:i,primaryCta:{label:"Try again",onClick:async()=>{if(o.status!=="ready"){h(!0);try{await n(),t({step:"token"})}catch{h(!1)}}else t({step:"token"})},loading:m},watermark:!0})}function rr(){let{state:e,close:t}=C("failed"),{order:o}=e;return r.jsx(w,{icon:R,iconVariant:"error",title:"Transfer failed",subtitle:"Something went wrong processing your transfer.",showClose:!0,onClose:t,primaryCta:{label:"Done",onClick:t},secondaryCta:{label:"Learn about manual recovery",onClick:()=>window.open("https://docs.privy.io","_blank","noopener,noreferrer")},watermark:!0,children:r.jsxs(tr,{href:o.tracking_url,target:"_blank",rel:"noopener noreferrer",children:["Reference: ",o.provider_request_id]})})}let tr=d.a`
  text-align: center;
  font-size: 0.75rem;
  opacity: 0.7;
  text-decoration: underline;
  cursor: pointer;
  color: var(--privy-color-foreground-3);
`;function or(){let{close:e,setModalState:t,config:o,params:n}=g(),[i,c]=p.useState(!1);return p.useEffect(()=>{if(i&&n){if(o.status==="ready"){let l=V(o.data,n);t(l?{step:"error",code:"ROUTE_UNAVAILABLE",message:l}:{step:"token"})}o.status==="error"&&t({step:"error",code:"ROUTE_UNAVAILABLE"})}},[i,o,n,t]),r.jsx(E,{icon:ee,iconVariant:"subtle",title:"Add funds",subtitle:"Top up your account by sending crypto from any wallet. Conversion and routing handled by Relay.",showClose:!0,onClose:e,primaryCta:{label:"Continue",onClick:()=>{if(o.status==="ready"&&n){let l=V(o.data,n);t(l?{step:"error",code:"ROUTE_UNAVAILABLE",message:l}:{step:"token"})}else o.status==="error"?t({step:"error",code:"ROUTE_UNAVAILABLE"}):c(!0)},loading:i&&o.status==="loading",loadingText:null},watermark:!0})}function nr(){let{state:e,setModalState:t,close:o}=C("network"),[n,i]=p.useState(-1),{availableChains:c}=e,{confirm:l,isFetching:u}=function(){let s=Y(),{params:a}=g(),{fetchQuote:m,isFetching:h}=re();return{confirm:p.useCallback(async y=>{if(!y||!a)return;let f=s==null?void 0:s.modalState;f&&f.step==="network"&&await m(y,f.selectedCurrency,f.availableChains)},[a,s,m]),isFetching:h}}();return r.jsx(w,{title:"Select network",eyebrow:r.jsxs("span",{style:{display:"flex",alignItems:"center",gap:"0.375rem"},children:[r.jsx("img",{src:e.selectedCurrency.logoURI,alt:"",style:{width:"1rem",height:"1rem",borderRadius:"50%"}}),"Send ",e.selectedCurrency.symbol]}),showBack:!0,onBack:()=>t({step:"token"}),showClose:!0,onClose:o,watermark:!0,children:r.jsx(X,{style:{marginTop:"1rem",height:"22rem"},$colorScheme:"light",children:c.map((s,a)=>r.jsxs(se,{$selected:n===a,disabled:u,onClick:()=>{i(a),l(s)},children:[r.jsx(ne,{src:s.iconUrl,alt:s.displayName}),r.jsx(ie,{children:s.displayName}),u&&a===n&&r.jsx(ae,{})]},s.caip2))})})}const ir=({trackingUrl:e,onClose:t})=>r.jsx(w,{icon:De,iconVariant:"subtle",title:"Transfer in progress",subtitle:"Your deposit was received and the transfer is now processing.",showClose:!0,onClose:t,secondaryCta:{label:"View on block explorer ↗",onClick:()=>window.open(e,"_blank","noopener,noreferrer")},watermark:!1,children:r.jsxs(Ge,{children:[r.jsxs(T,{children:[r.jsx(j,{$status:"done",children:r.jsx(F,{size:14,color:"var(--privy-color-icon-success)",strokeWidth:2})}),r.jsx(N,{children:"Deposit received"})]}),r.jsx(q,{}),r.jsxs(T,{children:[r.jsx(j,{$status:"active",children:r.jsx(sr,{})}),r.jsx(N,{children:"Bridging"})]}),r.jsx(q,{}),r.jsxs(T,{children:[r.jsx(j,{$status:"pending"}),r.jsx(N,{children:"Funds arrived"})]})]})});let sr=d.span`
  width: 0.75rem;
  height: 0.75rem;
  border: 2px solid var(--privy-color-foreground-3);
  border-bottom-color: transparent;
  border-radius: 50%;
  display: inline-block;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;function ar(){let{state:e,close:t}=C("processing");return function({orderId:o,enabled:n}){let{privy:i}=_(),{setModalState:c}=g();p.useEffect(()=>{let l=new AbortController;return $.waitForCompletion({privy:i,orderId:o,signal:l.signal}).then(u=>{l.signal.aborted||(u.status==="success"?te(u.order,c):u.status==="timeout"&&c({step:"error",code:"TIMEOUT_ORDER_COMPLETION"}))}),()=>{l.abort()}},[n,o,i,c])}({orderId:e.order.id,enabled:!0}),r.jsx(ir,{trackingUrl:e.order.tracking_url,onClose:t})}function lr(){let{state:e,close:t}=C("refunded"),{order:o}=e;return r.jsx(E,{icon:Be,iconVariant:"subtle",title:"Transfer refunded",subtitle:"Your transfer was received, but the swap couldn't be completed. A refund has been started automatically.",showClose:!0,onClose:t,primaryCta:{label:"Done",onClick:t},secondaryCta:{label:"View transaction details",onClick:()=>window.open(o.tracking_url,"_blank","noopener,noreferrer")},watermark:!0})}function dr(){let{close:e,setModalState:t,config:o}=g(),{confirm:n,currencies:i,isFetching:c}=function(){let{config:s,setModalState:a}=g(),{fetchQuote:m,isFetching:h}=re(),y=s.status==="ready"?s.data.currencies:[];return{confirm:p.useCallback(async f=>{if(s.status!=="ready"||!f)return;let b=function(v,le){return v.chains.map(x=>{let k=le.chains[x.caip2];return k?{caip2:x.caip2,displayName:k.displayName,iconUrl:k.iconUrl,vmType:k.vmType,currencyAddress:x.address,currencyDecimals:x.decimals}:null}).filter(x=>x!==null)}(f,s.data);if(b.length!==1)a({step:"network",selectedCurrency:f,availableChains:b});else{let v=b[0];await m(v,f,b)}},[s,m,a]),currencies:y,isFetching:h}}(),[l,u]=p.useState(-1);return r.jsx(w,{title:"Select token",showBack:!0,onBack:()=>t({step:"intro"}),showClose:!0,onClose:e,watermark:!0,children:o.status==="error"?r.jsx(B,{children:r.jsx(Xe,{children:"Failed to load tokens"})}):o.status==="loading"?r.jsx(B,{children:r.jsx(Q,{})}):r.jsx(X,{style:{marginTop:"1rem",height:"22rem"},$colorScheme:"light",children:i.map((s,a)=>r.jsxs(se,{$selected:l===a,disabled:c,onClick:()=>{u(a),n(s)},children:[r.jsx(oe,{src:s.logoURI,alt:s.symbol}),r.jsx(ie,{children:s.name}),c&&a===l?r.jsx(ae,{}):r.jsx(Ke,{children:s.symbol})]},s.symbol))})})}function cr({address:e,onClick:t}){let[o,n]=p.useState(!1);return r.jsx(r.Fragment,{children:o?r.jsx(ur,{onClick:()=>n(!1),style:{marginTop:"1.5rem"},children:r.jsx(ge,{url:e,size:312,hideLogo:!0})}):r.jsxs(mr,{title:"Click to copy address",onClick:t,style:{marginTop:"1.5rem"},children:[r.jsxs(pr,{children:[r.jsx(hr,{children:"Deposit address"}),r.jsx(fr,{children:e})]}),r.jsx(gr,{children:r.jsx(yr,{type:"button",onClick:i=>{i.stopPropagation(),n(!0)},children:r.jsx(ee,{size:16,color:"var(--privy-color-icon-muted)"})})})]})})}let ur=d.div`
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  overflow: hidden;
`,mr=d.div`
  display: flex;
  border-radius: var(--privy-border-radius-md);
  background: var(--privy-color-background-clicked, #f1f2f9);
  padding: 1rem;
  cursor: pointer;
  gap: 0.5rem;
`,pr=d.div`
  flex: 1;
  min-width: 0;
  text-align: left;
`,hr=d.div`
  font-size: 0.75rem;
  color: var(--privy-color-icon-muted);
  line-height: 1rem;
  margin-bottom: 0.25rem;
`,fr=d.div`
  word-break: break-all;
  font-size: 0.875rem;
  font-family: ui-monospace, monospace;
  font-weight: 500;
  line-height: 1.375rem;
  color: var(--privy-color-foreground);
`,gr=d.div`
  width: 1.5rem;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding-top: 0.25rem;
`,yr=d.button`
  && {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    background: transparent;
    cursor: pointer;
    outline: none;
    box-shadow: none;
    border-radius: var(--privy-border-radius-xs);

    &:hover {
      background: var(--privy-color-background);
    }

    &:focus,
    &:focus-visible {
      outline: none;
      box-shadow: none;
    }
  }
`;function br({quote:e,selectedCurrency:t,selectedChain:o,destinationSymbol:n}){let[i,c]=p.useState(!1),l=t.symbol.toUpperCase(),u=o.displayName,s=p.useRef(null);return r.jsxs(vr,{children:[r.jsxs(xr,{onClick:p.useCallback(()=>{let a=document.getElementById("privy-modal-content");a&&(s.current&&clearTimeout(s.current),a.style.transition="none",s.current=setTimeout(()=>{a.style.transition="",s.current=null},160)),c(m=>!m)},[]),children:[r.jsxs(Cr,{children:[t.logoURI&&r.jsx(oe,{src:t.logoURI,alt:l,style:{width:"2rem",height:"2rem"}}),o.iconUrl&&r.jsx(wr,{src:o.iconUrl,alt:u})]}),r.jsxs(kr,{children:[r.jsx(_r,{children:"You send"}),r.jsxs(Er,{children:[l," on ",u]})]}),r.jsx(Tr,{children:r.jsx(i?ze:Ie,{size:16})})]}),r.jsx(Ur,{$expanded:i,children:r.jsx(Ar,{children:r.jsxs(jr,{children:[e.indicative_rate&&r.jsxs(S,{children:[r.jsx(U,{children:"Conversion rate"}),r.jsxs(A,{style:{display:"flex",alignItems:"center",gap:"0.25rem"},children:[He(e.indicative_rate,l,n.toUpperCase()),r.jsx(Ir,{content:"Estimated rate based on current market conditions. Final execution price may vary depending on transfer size and routing."})]})]}),r.jsxs(S,{children:[r.jsx(U,{children:"Max slippage"}),r.jsxs(A,{children:[(e.slippage_bps/100).toFixed(1),"%"]})]}),r.jsxs(S,{children:[r.jsx(U,{children:"Refund address"}),r.jsx(A,{children:r.jsx(Ae,{value:e.refund_address,iconOnly:!0,iconSize:11,children:ue(e.refund_address,4,4)})})]})]})})}),r.jsxs(Nr,{children:[r.jsx(R,{size:16,color:"var(--privy-color-icon-muted)",style:{flexShrink:0}}),r.jsxs(Sr,{children:["Only send ",r.jsx("strong",{children:l})," on ",r.jsx("strong",{children:u}),". Other assets may be lost."]})]})]})}let vr=d.div`
  border-radius: var(--privy-border-radius-md);
  border: 1px solid var(--privy-color-foreground-4);
  overflow: hidden;
`,xr=d.button`
  && {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--privy-color-foreground);
    outline: none;
    box-shadow: none;

    &:focus,
    &:focus-visible {
      outline: none;
      box-shadow: none;
    }
  }
`,Cr=d.span`
  position: relative;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
`,wr=d(ne)`
  && {
    position: absolute;
    top: -0.125rem;
    right: -0.25rem;
    width: 0.75rem;
    height: 0.75rem;
    box-sizing: content-box;
    border: 1.5px solid #fff;
    background-color: #fff;
  }
`,kr=d.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`,_r=d.span`
  font-size: 0.75rem;
  color: var(--privy-color-foreground-3);
  line-height: 1rem;
`,Er=d.span`
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.25rem;
`,Tr=d.span`
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: var(--privy-border-radius-full);
  background-color: var(--privy-color-background-clicked, #f1f2f9);
  color: var(--privy-color-foreground-3);
`,jr=d.div`
  display: flex;
  flex-direction: column;
  padding: 0 1rem 0.75rem;

  & > * {
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--privy-color-foreground-4);
  }

  & > *:last-child {
    border-bottom: none;
  }
`,Nr=d.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0.75rem 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--privy-border-radius-sm);
  background: #f8f9fc;
`,Sr=d.span`
  font-size: 0.8125rem;
  line-height: 1.25rem;
  color: var(--privy-color-icon-muted);
  text-align: left;
`,Ur=d.div`
  display: grid;
  grid-template-rows: ${({$expanded:e})=>e?"1fr":"0fr"};
  transition: grid-template-rows 150ms ease-out;
`,Ar=d.div`
  overflow: hidden;
`;function Ir({content:e}){let[t,o]=p.useState(!1),{refs:n,floatingStyles:i,context:c}=ye({open:t,onOpenChange:o,placement:"top",whileElementsMounted:je,middleware:[Ne(6),Se(),Ue({padding:8})]}),l=be(c,{move:!1,handleClose:ve()}),u=xe(c),{getReferenceProps:s,getFloatingProps:a}=Ce([l,u,we(c),ke(c),_e(c,{role:"tooltip"})]),{isMounted:m,styles:h}=Ee(c,{duration:150});return r.jsxs(r.Fragment,{children:[r.jsx("button",{ref:n.setReference,type:"button","aria-label":"More information about conversion rate",style:{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:0,border:"none",background:"none",color:"var(--privy-color-icon-muted)",cursor:"pointer"},...s(),children:r.jsx(Re,{size:14})}),m&&r.jsx(Te,{root:document.getElementById("privy-modal-content")??void 0,children:r.jsx(Dr,{ref:n.setFloating,style:{...i,...h},...a(),children:e})})]})}let Dr=d.div`
  max-width: 13rem;
  padding: 0.5rem 0.625rem;
  border-radius: var(--privy-border-radius-sm, 0.375rem);
  background: var(--privy-color-foreground);
  color: var(--privy-color-background);
  font-size: 0.6875rem;
  line-height: 1rem;
  font-weight: 400;
  text-align: left;
  z-index: 10;
`;const Rr=({quote:e,selectedCurrency:t,selectedChain:o,destinationSymbol:n,onBack:i,onClose:c})=>{var h;let[l,u]=p.useState(!1),s=((h=t==null?void 0:t.symbol)==null?void 0:h.toUpperCase())??"funds",a=(o==null?void 0:o.displayName)??"",m=async()=>{l||(await navigator.clipboard.writeText(e.deposit_address),u(!0),setTimeout(()=>u(!1),2e3))};return r.jsxs(w,{title:`Send ${s}${a?` on ${a}`:""}`,subtitle:"Send funds to the address below. Conversion and routing handled by Relay.",showBack:!0,onBack:i,showClose:!0,onClose:c,watermark:!1,children:[r.jsx(br,{quote:e,selectedCurrency:t,selectedChain:o,destinationSymbol:n}),r.jsx(cr,{address:e.deposit_address,onClick:m}),r.jsx(fe,{style:{marginTop:"1rem",marginBottom:"0.5rem",...l?{backgroundColor:"var(--privy-color-icon-success)",borderColor:"var(--privy-color-icon-success)"}:{}},onClick:m,children:l?r.jsxs(r.Fragment,{children:["Copied ",r.jsx(F,{size:16,style:{marginLeft:"0.25rem"}})]}):"Copy address"}),r.jsx(Or,{children:"Routing and bridging are handled by Relay. Privy does not control execution timing, liquidity, or transaction outcomes."})]})};let Or=d.p`
  && {
    margin: 0.5rem 0 0;
    font-size: 0.6875rem;
    line-height: 1.125rem;
    color: var(--privy-color-icon-muted);
    text-align: center;
  }
`;function Fr(){let{state:e,configData:t,setModalState:o,close:n,params:i}=C("address"),{quote:c,selectedCurrency:l,selectedChain:u,availableChains:s}=e;return function({depositAddressId:a,enabled:m,quoteCreatedAt:h}){let{privy:y}=_(),{setModalState:f}=g();p.useEffect(()=>{if(!a)return;let b=new AbortController;return $.waitForDeposit({privy:y,depositAddressId:a,quoteCreatedAt:h,signal:b.signal}).then(v=>{b.signal.aborted||(v.status==="success"?te(v.order,f):v.status==="timeout"&&f({step:"error",code:"TIMEOUT_WAITING_FOR_NEXT_ORDER"}))}),()=>{b.abort()}},[m,a,y,h,f])}({depositAddressId:c.id,enabled:!0,quoteCreatedAt:c.created_at}),r.jsx(Rr,{quote:c,selectedCurrency:l,selectedChain:u,destinationSymbol:p.useMemo(()=>I({address:i.destinationCurrency,caip2:i.destinationChain,config:t}).symbol,[i,t]),onBack:()=>o({step:"network",selectedCurrency:l,availableChains:s}),onClose:n})}function $r(){let{modalState:e,setModalState:t}=g();return r.jsx(qe,{onError:o=>t({step:"error",code:"UNEXPECTED_STATE",message:o.message}),resetKey:e.step,children:r.jsx(Pr,{})})}function Pr(){let{modalState:e}=g();switch(e.step){case"intro":return r.jsx(or,{});case"token":return r.jsx(dr,{});case"network":return r.jsx(nr,{});case"address":return r.jsx(Fr,{});case"processing":return r.jsx(ar,{});case"complete":return r.jsx(Ze,{});case"refunded":return r.jsx(lr,{});case"failed":return r.jsx(rr,{});case"error":return r.jsx(er,{});default:return null}}var ot={component:()=>{let{onUserCloseViaDialogOrKeybindRef:e}=ce(),t=Y(),{close:o,config:n}=g();return p.useEffect(()=>{e.current=o},[e,o]),p.useEffect(()=>{if(n.status==="ready"){for(let i of n.data.currencies)new Image().src=i.logoURI;for(let i of Object.values(n.data.chains))new Image().src=i.iconUrl}},[n]),t?r.jsx($r,{}):null}};export{ot as default};
