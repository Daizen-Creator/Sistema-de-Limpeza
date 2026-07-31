import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;

/**
 * Gera um arquivo .ico (com entradas PNG) a partir de uma imagem.
 * Uso: java IcoGen <entrada.jpg/png> <saida.ico>
 * Recorta a imagem em quadrado central e gera tamanhos 256/64/48/32/16.
 */
public class IcoGen {
    static final int[] SIZES = { 256, 64, 48, 32, 16 };

    public static void main(String[] args) throws Exception {
        if (args.length < 2) { System.err.println("uso: IcoGen entrada saida.ico"); System.exit(1); }
        BufferedImage src = ImageIO.read(new File(args[0]));
        if (src == null) { System.err.println("nao foi possivel ler a imagem"); System.exit(1); }

        BufferedImage sq = cropSquare(src);

        // gera PNG de cada tamanho
        byte[][] pngs = new byte[SIZES.length][];
        for (int i = 0; i < SIZES.length; i++) {
            BufferedImage scaled = scale(sq, SIZES[i]);
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            ImageIO.write(scaled, "png", bo);
            pngs[i] = bo.toByteArray();
        }

        // monta o ICO
        try (DataOutputStream out = new DataOutputStream(
                new BufferedOutputStream(Files.newOutputStream(Paths.get(args[1]))))) {
            // ICONDIR
            writeLE16(out, 0);            // reserved
            writeLE16(out, 1);            // type = icon
            writeLE16(out, SIZES.length); // count

            int offset = 6 + 16 * SIZES.length;
            for (int i = 0; i < SIZES.length; i++) {
                int s = SIZES[i];
                out.writeByte(s >= 256 ? 0 : s); // width
                out.writeByte(s >= 256 ? 0 : s); // height
                out.writeByte(0);                // color count
                out.writeByte(0);                // reserved
                writeLE16(out, 1);               // planes
                writeLE16(out, 32);              // bit count
                writeLE32(out, pngs[i].length);  // bytes in res
                writeLE32(out, offset);          // offset
                offset += pngs[i].length;
            }
            for (byte[] png : pngs) out.write(png);
        }
        System.out.println("ICO gerado: " + args[1]);
    }

    static BufferedImage cropSquare(BufferedImage img) {
        int w = img.getWidth(), h = img.getHeight();
        int side = Math.min(w, h);
        int x = (w - side) / 2, y = (h - side) / 2;
        return img.getSubimage(x, y, side, side);
    }

    static BufferedImage scale(BufferedImage img, int size) {
        BufferedImage out = new BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.drawImage(img, 0, 0, size, size, null);
        g.dispose();
        return out;
    }

    static void writeLE16(DataOutputStream o, int v) throws IOException {
        o.writeByte(v & 0xFF); o.writeByte((v >> 8) & 0xFF);
    }
    static void writeLE32(DataOutputStream o, int v) throws IOException {
        o.writeByte(v & 0xFF); o.writeByte((v >> 8) & 0xFF);
        o.writeByte((v >> 16) & 0xFF); o.writeByte((v >> 24) & 0xFF);
    }
}
