package com.toptennis.service;

import com.toptennis.model.Booking;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;
    private static final String FROM_EMAIL = "rezervari@star-arena.ro";
    
    @org.springframework.beans.factory.annotation.Value("${app.base-url}")
    private String baseUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendBookingConfirmation(Booking booking) {
        if (booking.getCustomerEmail() == null || booking.getCustomerEmail().isBlank()) {
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            // Set personal name for a more professional look
            helper.setFrom(FROM_EMAIL, "Star Arena");
            helper.setTo(booking.getCustomerEmail());
            helper.setSubject("Confirmare Rezervare - Star Arena Bascov");

            String htmlContent = buildBookingHtml(booking);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Email de confirmare trimis către: {}", booking.getCustomerEmail());
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Eroare la trimiterea email-ului către {}: {}", booking.getCustomerEmail(), e.getMessage());
        }
    }

    private String buildBookingHtml(Booking booking) {
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd.MM.yyyy");
        String dateStr = booking.getBookingDate().format(dateFormatter);
        String sportName = booking.getCourt().getSportType().toString().replace("TENNIS", "TENIS");
        String mapsUrl = "https://maps.app.goo.gl/Z7LWuvTvo1cbWJNGA"; // Cosmin Top Tenis (Default)
        if (booking.getCourt().getSportType().toString().contains("PADEL") && booking.getCourt().isIndoor()) {
            mapsUrl = "https://maps.app.goo.gl/9eRR5rjmoV6ooGi56"; // Star Arena
        }
        
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head>" +
               "<body style='margin: 0; padding: 0; font-family: \"Outfit\", \"Inter\", Arial, sans-serif; background-color: #f3f4f6; color: #1f2937;'>" +
               "  <div style='max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);'>" +
               "    <!-- Header with Image -->" +
               "    <div style='background: linear-gradient(135deg, #064e3b 0%, #10b981 100%); padding: 40px 20px; text-align: center;'>" +
               "      <h1 style='color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;'>Star Arena</h1>" +
               "      <p style='color: #d1fae5; margin: 10px 0 0; font-size: 16px; font-weight: 500;'>Rezervarea ta este confirmată</p>" +
               "    </div>" +
               "    " +
               "    <div style='padding: 40px 30px;'>" +
               "      <h2 style='color: #111827; margin: 0 0 20px; font-size: 22px; font-weight: 700;'>Salutare, " + booking.getCustomerName() + "!</h2>" +
               "      <p style='color: #4b5563; line-height: 1.6; margin-bottom: 30px;'>Ne bucurăm să te avem alături. Detaliile rezervării tale la <strong>Star Arena Bascov</strong> sunt pregătite:</p>" +
               "      " +
               "      <div style='background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 16px; padding: 25px; margin-bottom: 30px;'>" +
               "        <table style='width: 100%; border-collapse: collapse;'>" +
               "          <tr>" +
               "            <td style='padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase;'>Sport / Teren</td>" +
               "            <td style='padding: 8px 0; color: #111827; font-size: 16px; font-weight: 700; text-align: right;'>" + sportName + " - " + booking.getCourt().getName() + "</td>" +
               "          </tr>" +
               "          <tr>" +
               "            <td style='padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase;'>Data</td>" +
               "            <td style='padding: 8px 0; color: #111827; font-size: 16px; font-weight: 700; text-align: right;'>" + dateStr + "</td>" +
               "          </tr>" +
               "          <tr>" +
               "            <td style='padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase;'>Interval Orar</td>" +
               "            <td style='padding: 8px 0; color: #111827; font-size: 16px; font-weight: 700; text-align: right;'>" + booking.getStartTime() + " - " + booking.getEndTime() + "</td>" +
               "          </tr>" +
               "          <tr style='border-top: 1px solid #e5e7eb;'>" +
               "            <td style='padding: 15px 0 0; color: #10b981; font-size: 16px; font-weight: 800; text-transform: uppercase;'>Total de plată</td>" +
               "            <td style='padding: 15px 0 0; color: #064e3b; font-size: 20px; font-weight: 800; text-align: right;'>" + booking.getPrice() + " RON</td>" +
               "          </tr>" +
               "        </table>" +
               "      </div>" +
               "      " +
               "      <div style='text-align: center; margin-bottom: 30px;'>" +
               "        <a href='" + mapsUrl + "' style='display: inline-block; background-color: #111827; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; text-align: center;'>Vezi locația pe hartă</a>" +
               "      </div>" +
               "      " +
               "      <div style='background-color: #ecfdf5; border-radius: 12px; padding: 25px 20px; text-align: center; margin-bottom: 30px; border: 1px solid #d1fae5;'>" +
               "        <p style='color: #065f46; font-size: 15px; line-height: 1.6; margin: 0 0 15px;'>Pentru a gestiona sau anula această rezervare (gratuit, cu până la 24 de ore înainte), te rugăm să folosești contul tău.</p>" +
               "        <a href='" + baseUrl + "' style='display: inline-block; background-color: #10b981; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;'>Accesează contul tău</a>" +
               "      </div>" +
               "      " +
               "      <p style='color: #4b5563; font-size: 16px; font-weight: 500; text-align: center; margin: 0;'>Te așteptăm cu drag în arenă!</p>" +
               "    </div>" +
               "    " +
               "    <div style='background-color: #f9fafb; padding: 30px; border-top: 1px solid #f3f4f6; text-align: center; color: #9ca3af; font-size: 12px;'>" +
               "      <p style='margin: 0 0 10px;'>Aceasta este o confirmare automată. Plata se face direct la locație.</p>" +
               "      <p style='margin: 0;'><strong>Star Arena Bascov</strong> - Argeș, România</p>" +
               "    </div>" +
               "  </div>" +
               "</body></html>";
    }
}
