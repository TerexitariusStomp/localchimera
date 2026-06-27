import{aY as r}from"./index-ba860db5.js";import{g as e}from"./index-00419ca3.js";const a=({title:i,description:t,children:n,...o})=>r.jsx(l,{...o,children:r.jsxs(r.Fragment,{children:[r.jsx("h3",{children:i}),typeof t=="string"?r.jsx("p",{children:t}):t,n]})});e(a)`
  margin-bottom: 24px;
`;const g=({title:i,description:t,icon:n,children:o,...s})=>r.jsxs(c,{...s,children:[n||null,r.jsx("h3",{children:i}),t&&typeof t=="string"?r.jsx("p",{children:t}):t,o]});let l=e.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  text-align: left;
  gap: 8px;
  width: 100%;
  margin-bottom: 24px;

  && h3 {
    font-size: 17px;
    color: var(--privy-color-foreground);
  }

  /* Sugar assuming children are paragraphs. Otherwise, handling styling on your own */
  && p {
    color: var(--privy-color-foreground-2);
    font-size: 14px;
  }
`,c=e(l)`
  align-items: center;
  text-align: center;
  gap: 16px;

  h3 {
    margin-bottom: 24px;
  }
`;export{a as n,g as o};
