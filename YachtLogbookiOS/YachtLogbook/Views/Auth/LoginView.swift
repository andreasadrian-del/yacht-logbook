import SwiftUI

struct LoginView: View {
    @EnvironmentObject var supabaseService: SupabaseService

    @State private var email = ""
    @State private var password = ""
    @State private var loading = false
    @State private var errorMsg = ""

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: 8) {
                Image(systemName: "sailboat.fill")
                    .font(.system(size: 52))
                    .foregroundStyle(.blue)
                Text("Logbook Nadira")
                    .font(.title.bold())
                Text("Sign in to continue")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding(.bottom, 40)

            VStack(spacing: 14) {
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                    .textContentType(.emailAddress)
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                SecureField("Password", text: $password)
                    .textContentType(.password)
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                if !errorMsg.isEmpty {
                    Text(errorMsg)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button(action: signIn) {
                    if loading {
                        ProgressView().tint(.white)
                    } else {
                        Text("Sign In")
                            .font(.headline)
                            .foregroundStyle(.white)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(canSubmit ? Color.blue : Color.gray)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .disabled(!canSubmit || loading)
            }
            .padding(.horizontal, 24)

            Spacer()
        }
        .background(Color(.systemBackground))
    }

    private var canSubmit: Bool { !email.isEmpty && !password.isEmpty }

    private func signIn() {
        guard canSubmit else { return }
        loading = true
        errorMsg = ""
        Task {
            do {
                try await supabaseService.signIn(email: email, password: password)
            } catch {
                errorMsg = error.localizedDescription
            }
            loading = false
        }
    }
}
