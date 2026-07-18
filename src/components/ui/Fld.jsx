import{S}from"../../theme";
export const Fld=({label,children,half,third})=>{const w=third?"calc(33.3% - 8px)":half?"calc(50% - 6px)":"100%";return(<div style={{marginBottom:13,width:w,display:"inline-block",verticalAlign:"top",marginRight:half||third?"12px":"0"}}><label style={S.lbl}>{label}</label>{children}</div>);};
