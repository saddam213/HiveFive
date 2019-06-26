using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace HiveFive.Framework.Security
{
	public class Cryptopgraphy
	{
		public static string CreateSignature(string secretKey, string dataToSign)
		{
			// Get hash by using apiSecret as key, and challenge as data
			var hmacSha512 = new HMACSHA512(Encoding.ASCII.GetBytes(secretKey));
			var hash = hmacSha512.ComputeHash(Encoding.ASCII.GetBytes(dataToSign));
			return BitConverter.ToString(hash).Replace("-", string.Empty);
		}

		public static string GenerateToken()
		{
			var invalidChars = "O0I1VW";
			var cryptRNG = new RNGCryptoServiceProvider();
			byte[] tokenBuffer = new byte[100];
			cryptRNG.GetBytes(tokenBuffer);
			var content = new string(Convert.ToBase64String(tokenBuffer)
				.Where(char.IsLetterOrDigit)
				.Select(char.ToUpper)
				.Where(c => !invalidChars.Contains(c))
				.ToArray());
			return $"{content.Substring(0, 4)}-{content.Substring(3, 4)}-{content.Substring(7, 4)}";
		}
	}
}