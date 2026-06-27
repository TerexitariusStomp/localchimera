import{aV as d,aY as e}from"./index-ba860db5.js";import{g as c}from"./index-00419ca3.js";import{C as u}from"./check-62954129.js";import{C as g}from"./copy-84c4e364.js";let a=c.button`
  display: flex;
  align-items: center;
  justify-content: end;
  gap: 0.5rem;

  && {
    color: var(--privy-color-foreground);
    font-weight: 500;
  }

  svg {
    width: 0.875rem;
    height: 0.875rem;
  }
`,h=c.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: var(--privy-color-foreground-2);
`,x=c(u)`
  color: var(--privy-color-icon-success);
  flex-shrink: 0;
`,m=c(g)`
  color: var(--privy-color-icon-muted);
  flex-shrink: 0;
`;function C({children:r,iconOnly:l,value:o,hideCopyIcon:i,iconSize:t=14,...n}){let[s,p]=d.useState(!1);return e.jsxs(a,{...n,onClick:()=>{navigator.clipboard.writeText(o||(typeof r=="string"?r:"")).catch(console.error),p(!0),setTimeout(()=>p(!1),1500)},children:[r," ",s?e.jsxs(h,{children:[e.jsx(x,{size:t})," ",!l&&"Copied"]}):!i&&e.jsx(m,{size:t})]})}const k=({value:r,includeChildren:l,children:o,...i})=>{let[t,n]=d.useState(!1),s=()=>{navigator.clipboard.writeText(r).catch(console.error),n(!0),setTimeout(()=>n(!1),1500)};return e.jsxs(e.Fragment,{children:[l?e.jsx(a,{...i,onClick:s,children:o}):e.jsx(e.Fragment,{children:o}),e.jsx(a,{...i,onClick:s,children:t?e.jsx(h,{children:e.jsx(x,{})}):e.jsx(m,{})})]})};export{C as m,k as p};
