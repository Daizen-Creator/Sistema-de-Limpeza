import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.Path2D;
import java.awt.geom.RoundRectangle2D;
import java.awt.image.BufferedImage;
import java.io.File;

/** Gera as imagens do instalador NSIS (tema hacker) em BMP. */
public class SidebarGen {

    public static void main(String[] args) throws Exception {
        ImageIO.write(sidebar(164, 314), "bmp", new File("build/installer-sidebar.bmp"));
        ImageIO.write(header(150, 57), "bmp", new File("build/installer-header.bmp"));
        System.out.println("Imagens do instalador geradas em build/");
    }

    static BufferedImage sidebar(int w, int h) {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = hq(img);
        // fundo gradiente verde-preto
        g.setPaint(new GradientPaint(0, 0, new Color(0x0d2416), 0, h, new Color(0x03080a)));
        g.fillRect(0, 0, w, h);
        // grade sutil
        g.setColor(new Color(34, 255, 119, 22));
        for (int x = 0; x < w; x += 20) g.drawLine(x, 0, x, h);
        for (int y = 0; y < h; y += 20) g.drawLine(0, y, w, y);
        // brilho
        g.setPaint(new RadialGradientPaint(new Point(w / 2, 70), 120,
                new float[]{0f, 1f}, new Color[]{new Color(34, 255, 119, 60), new Color(34, 255, 119, 0)}));
        g.fillRect(0, 0, w, 160);
        // logo (escudo) centralizado no topo
        drawLogo(g, w / 2 - 34, 30, 68);
        // textos
        g.setColor(new Color(0xD7FFE4));
        g.setFont(new Font("Segoe UI", Font.BOLD, 20));
        drawCentered(g, "NEXUS", w / 2, 132);
        g.setColor(new Color(0x22FF77));
        drawCentered(g, "CLEAN", w / 2, 154);
        g.setColor(new Color(0x5f9070));
        g.setFont(new Font("Consolas", Font.PLAIN, 10));
        drawCentered(g, "Otimizador do Windows", w / 2, 176);
        // linha neon
        g.setColor(new Color(0x12c04a));
        g.fillRect(30, 196, w - 60, 2);
        // rodape
        g.setColor(new Color(0x3f9d63));
        g.setFont(new Font("Consolas", Font.PLAIN, 9));
        drawCentered(g, "por Daniel Santos", w / 2, h - 30);
        drawCentered(g, "Ciriaco", w / 2, h - 18);
        g.dispose();
        return img;
    }

    static BufferedImage header(int w, int h) {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = hq(img);
        g.setPaint(new GradientPaint(0, 0, new Color(0x0a1a10), w, 0, new Color(0x05100a)));
        g.fillRect(0, 0, w, h);
        drawLogo(g, 12, h / 2 - 18, 36);
        g.setColor(new Color(0xD7FFE4));
        g.setFont(new Font("Segoe UI", Font.BOLD, 15));
        g.drawString("NexusClean", 58, h / 2 + 5);
        g.dispose();
        return img;
    }

    /** Desenha o escudo + ">_" verde. */
    static void drawLogo(Graphics2D g, int x, int y, int size) {
        double s = size / 64.0;
        Path2D shield = new Path2D.Double();
        shield.moveTo(32, 3); shield.lineTo(56, 12); shield.lineTo(56, 30);
        shield.curveTo(56, 46, 45, 56, 32, 61);
        shield.curveTo(19, 56, 8, 46, 8, 30);
        shield.lineTo(8, 12); shield.closePath();
        Graphics2D g2 = (Graphics2D) g.create();
        g2.translate(x, y); g2.scale(s, s);
        g2.setColor(new Color(0x04160b));
        g2.fill(shield);
        g2.setStroke(new BasicStroke(2.6f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        g2.setColor(new Color(0x22FF77));
        g2.draw(shield);
        g2.setStroke(new BasicStroke(3.4f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        Path2D chev = new Path2D.Double();
        chev.moveTo(22, 24); chev.lineTo(30, 32); chev.lineTo(22, 40);
        g2.draw(chev);
        g2.draw(new java.awt.geom.Line2D.Double(34, 41, 43, 41));
        g2.dispose();
    }

    static void drawCentered(Graphics2D g, String t, int cx, int y) {
        int tw = g.getFontMetrics().stringWidth(t);
        g.drawString(t, cx - tw / 2, y);
    }

    static Graphics2D hq(BufferedImage img) {
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        return g;
    }
}
