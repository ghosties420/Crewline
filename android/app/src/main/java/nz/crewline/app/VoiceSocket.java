package nz.crewline.app;
import javax.net.ssl.*;import java.net.*;import java.io.*;import java.security.*;import java.util.*;

// Small RFC6455 client for the fixed-size mu-law protocol. TLS hostname verification stays enabled.
final class VoiceSocket implements AutoCloseable {
 private SSLSocket socket;private InputStream in;private OutputStream out;private final SecureRandom random=new SecureRandom();
 void connect(String base,String token,String call)throws Exception{
  URI uri=new URI(base);if(!"https".equals(uri.getScheme())||uri.getHost()==null)throw new IOException("HTTPS required");int port=uri.getPort()<0?443:uri.getPort();
  socket=(SSLSocket)SSLSocketFactory.getDefault().createSocket();socket.connect(new InetSocketAddress(uri.getHost(),port),8000);socket.setSoTimeout(30000);socket.setTcpNoDelay(true);SSLParameters params=socket.getSSLParameters();params.setEndpointIdentificationAlgorithm("HTTPS");socket.setSSLParameters(params);socket.startHandshake();in=socket.getInputStream();out=socket.getOutputStream();
  byte[] nonce=new byte[16];random.nextBytes(nonce);String key=Base64.getEncoder().encodeToString(nonce),path=(uri.getRawPath()==null?"":uri.getRawPath().replaceAll("/+$",""))+"/voice?call="+call;
  String request="GET "+path+" HTTP/1.1\r\nHost: "+uri.getHost()+(port==443?"":":"+port)+"\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: "+key+"\r\nAuthorization: Bearer "+token+"\r\n\r\n";out.write(request.getBytes("US-ASCII"));out.flush();
  ByteArrayOutputStream header=new ByteArrayOutputStream();int last=0;while(header.size()<16384){int b=in.read();if(b<0)throw new EOFException("Voice connection closed");header.write(b);last=(last<<8)|b;if(last==0x0d0a0d0a)break;}String response=header.toString("US-ASCII");if(!response.startsWith("HTTP/1.1 101 "))throw new IOException("Voice upgrade rejected; check server v1.1 and call membership");String expected=Base64.getEncoder().encodeToString(MessageDigest.getInstance("SHA-1").digest((key+"258EAFA5-E914-47DA-95CA-C5AB0DC85B11").getBytes("US-ASCII")));boolean valid=false;for(String line:response.split("\r\n"))if(line.toLowerCase(Locale.ROOT).startsWith("sec-websocket-accept:"))valid=line.substring(line.indexOf(':')+1).trim().equals(expected);if(!valid)throw new IOException("Invalid voice handshake");
 }
 synchronized void send(byte[] data,int op)throws IOException{if(out==null)throw new IOException("Voice socket not ready");int n=data.length;out.write(128|op);if(n<126)out.write(128|n);else{out.write(128|126);out.write(n>>8);out.write(n&255);}byte[] mask=new byte[4];random.nextBytes(mask);out.write(mask);byte[] encoded=new byte[n];for(int i=0;i<n;i++)encoded[i]=(byte)(data[i]^mask[i%4]);out.write(encoded);out.flush();}
 byte[] read()throws IOException{while(true){int a=in.read(),b=in.read();if(a<0||b<0)throw new EOFException("Call disconnected");int n=b&127,op=a&15;if((a&128)==0||(b&128)!=0||(a&112)!=0||n==127)throw new IOException("Invalid voice frame");if(n==126)n=(readByte()<<8)|readByte();if(n>2048)throw new IOException("Voice frame too large");byte[] data=new byte[n];int p=0;while(p<n){int k=in.read(data,p,n-p);if(k<0)throw new EOFException();p+=k;}if(op==8)throw new EOFException("Call ended");if(op==9){send(data,10);continue;}if(op==10)continue;if(op!=2||n!=208)throw new IOException("Invalid audio packet");return data;}}
 private int readByte()throws IOException{int b=in.read();if(b<0)throw new EOFException();return b;}
 public void close(){try{if(socket!=null)socket.close();}catch(Exception ignored){}}
}
