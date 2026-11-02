package nz.crewline.app;
import android.content.Context;
import java.net.*;import java.io.*;import org.json.*;
final class Api {
 static JSONObject call(Context c,String path,String method,JSONObject body)throws Exception{return callAt(Store.prefs(c).getString("server",""),Store.token(c),path,method,body);}
 static JSONObject callAt(String base,String token,String path,String method,JSONObject body)throws Exception{
  URI u=new URI(base);if(!"https".equals(u.getScheme())||u.getHost()==null||u.getUserInfo()!=null||u.getQuery()!=null||u.getFragment()!=null)throw new IOException("Use an HTTPS server address");
  if(!path.startsWith("/")||path.startsWith("//"))throw new IOException("Invalid API path");
  HttpURLConnection connection=(HttpURLConnection)new URL(base.replaceAll("/+$","")+path).openConnection();
  try{connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(8000);connection.setReadTimeout(8000);connection.setRequestMethod(method);connection.setRequestProperty("Content-Type","application/json");if(!token.isEmpty())connection.setRequestProperty("Authorization","Bearer "+token);
   if(body!=null){connection.setDoOutput(true);try(OutputStream o=connection.getOutputStream()){o.write(body.toString().getBytes("UTF-8"));}}
   int code=connection.getResponseCode();InputStream in=code>=400?connection.getErrorStream():connection.getInputStream();if(in==null)throw new IOException("Server returned "+code);ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(InputStream stream=in){byte[] b=new byte[4096];int n;while((n=stream.read(b))!=-1){bytes.write(b,0,n);if(bytes.size()>4*1024*1024)throw new IOException("Response too large");}}
   JSONObject r=new JSONObject(bytes.toString("UTF-8"));if(code<200||code>=300)throw new IOException(r.optString("error","Server returned "+code));return r;
  }finally{connection.disconnect();}
 }
}
