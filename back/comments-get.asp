<%@LANGUAGE="VBSCRIPT" CODEPAGE="65001"%>
<!--#include file="../JSON/JSON_2.0.4.asp"--> 
<!--#include file="../JSON/JSON_UTIL_0.1.1.asp"--> 

<%

Set conn = Server.CreateObject("ADODB.Connection")
conn.open "Provider=SQLOLEDB;Server=.\SQLEXPRESS;Database=map;Trusted_Connection=yes;"


Response.LCID = 2074
QueryToJSON(conn, "select * from CTable_1 where ID=1").flush

conn.close
Set conn = Nothing


%>


