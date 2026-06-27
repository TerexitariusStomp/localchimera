import{aV as c,aY as e}from"./index-ba860db5.js";import{g as r}from"./index-00419ca3.js";import{$ as p}from"./ModalHeader-YbJk-YIQ-1ed844bc.js";import{e as x}from"./ErrorMessage-D8VaAP5m-af3197ec.js";import{r as f}from"./LabelXs-oqZNqbm_-98ed037f.js";import{d as h}from"./Address-Wk5-LLxD-900e36bb.js";import{d as g}from"./shared-FM0rljBt-fbb6e928.js";import{C as j}from"./check-62954129.js";import{C as u}from"./copy-84c4e364.js";let v=r(g)`
  && {
    padding: 0.75rem;
    height: 56px;
  }
`,y=r.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`,C=r.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`,w=r.div`
  font-size: 12px;
  line-height: 1rem;
  color: var(--privy-color-foreground-3);
`,b=r(f)`
  text-align: left;
  margin-bottom: 0.5rem;
`,z=r(x)`
  margin-top: 0.25rem;
`,E=r(p)`
  && {
    gap: 0.375rem;
    font-size: 14px;
  }
`;const R=({errMsg:o,balance:s,address:a,className:d,title:n,showCopyButton:l=!1})=>{let[t,m]=c.useState(!1);return c.useEffect(()=>{if(t){let i=setTimeout(()=>m(!1),3e3);return()=>clearTimeout(i)}},[t]),e.jsxs("div",{children:[n&&e.jsx(b,{children:n}),e.jsx(v,{className:d,$state:o?"error":void 0,children:e.jsxs(y,{children:[e.jsxs(C,{children:[e.jsx(h,{address:a,showCopyIcon:!1}),s!==void 0&&e.jsx(w,{children:s})]}),l&&e.jsx(E,{onClick:function(i){i.stopPropagation(),navigator.clipboard.writeText(a).then(()=>m(!0)).catch(console.error)},size:"sm",children:e.jsxs(e.Fragment,t?{children:["Copied",e.jsx(j,{size:14})]}:{children:["Copy",e.jsx(u,{size:14})]})})]})}),o&&e.jsx(z,{children:o})]})};export{R as j};
