<%@LANGUAGE="VBSCRIPT" CODEPAGE="65001"%>
<!--#include file="../JSON/JSON_2.0.4.asp"--> 
<!--#include file="../JSON/JSON_UTIL_0.1.1.asp"--> 

<%

Set conn = Server.CreateObject("ADODB.Connection")
conn.open "Provider=SQLOLEDB;Server=.\SQLEXPRESS;Database=map;Trusted_Connection=yes;"


Response.LCID = 2074
QueryToJSON(conn, "select ID, ime AS fullname, slika_url AS profile_picture_url from korisnik").flush

conn.close
Set conn = Nothing


%>