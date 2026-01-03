# Deployment Checklist

Use this checklist when deploying AI Test Agents Lab to a new environment.

---

## Phase 1: Central Repository Setup

### 1.1 Repository Creation
- [ ] Fork or clone ai-test-agents-lab to your organization
- [ ] Push to `https://github.com/YOUR_ORG/ai-test-agents-lab`
- [ ] Set default branch to `main`
- [ ] Enable GitHub Actions (Settings → Actions → General)

### 1.2 Required Secrets
Go to Settings → Secrets and variables → Actions → Secrets

| Secret | Status | Notes |
|--------|--------|-------|
| `ANTHROPIC_API_KEY` | [ ] | Get from console.anthropic.com |

### 1.3 Optional Secrets (for S3)
| Secret | Status | Notes |
|--------|--------|-------|
| `AWS_ACCESS_KEY_ID` | [ ] | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | [ ] | IAM user secret key |

### 1.4 Repository Variables
Go to Settings → Secrets and variables → Actions → Variables

| Variable | Value | Status |
|----------|-------|--------|
| `S3_BUCKET` | `your-bucket-name` | [ ] |
| `AWS_REGION` | `us-east-1` | [ ] |
| `TEST_FRAMEWORK` | `playwright` | [ ] |

### 1.5 Verify Setup
- [ ] Run Demo workflow manually
- [ ] Verify all 3 phases complete
- [ ] Download and check artifacts

---

## Phase 2: S3 Bucket Setup (Optional)

### 2.1 Create Bucket
```bash
aws s3 mb s3://YOUR_BUCKET_NAME --region us-east-1
```
- [ ] Bucket created

### 2.2 Create IAM Policy
```bash
cat > policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
    "Resource": ["arn:aws:s3:::YOUR_BUCKET_NAME", "arn:aws:s3:::YOUR_BUCKET_NAME/*"]
  }]
}
EOF
aws iam create-policy --policy-name TestGenS3 --policy-document file://policy.json
```
- [ ] Policy created

### 2.3 Create IAM User
```bash
aws iam create-user --user-name test-gen-bot
aws iam attach-user-policy --user-name test-gen-bot --policy-arn arn:aws:iam::ACCOUNT:policy/TestGenS3
aws iam create-access-key --user-name test-gen-bot
```
- [ ] User created
- [ ] Policy attached
- [ ] Access keys saved securely

---

## Phase 3: Target Repository Setup

Repeat for each target repository.

### Repository: ________________________

#### 3.1 Workflow File
- [ ] Copy `templates/target-repo/.github/` to target repo
- [ ] Update `YOUR_ORG` to actual organization name
- [ ] Commit and push to main branch

#### 3.2 Secrets
| Secret | Status |
|--------|--------|
| `ANTHROPIC_API_KEY` | [ ] |
| `AWS_ACCESS_KEY_ID` | [ ] |
| `AWS_SECRET_ACCESS_KEY` | [ ] |

#### 3.3 Variables
| Variable | Value | Status |
|----------|-------|--------|
| `S3_BUCKET` | | [ ] |
| `AWS_REGION` | | [ ] |
| `TEST_FRAMEWORK` | | [ ] |

#### 3.4 Labels
- [ ] `generate-tests` (green #0E8A16)
- [ ] `awaiting-plan-approval` (yellow #FBCA04)
- [ ] `awaiting-cases-approval` (orange #F9A825)
- [ ] `tests-generated` (blue #1976D2)

#### 3.5 Verify
- [ ] Create test PR
- [ ] Add `generate-tests` label
- [ ] Phase 1 completes (test plan posted)
- [ ] Comment `/approve-plan`
- [ ] Phase 2 completes (scenarios posted)
- [ ] Comment `/approve-cases`
- [ ] Phase 3 completes (code committed)
- [ ] Pull and verify test file

---

## Phase 4: Post-Deployment Verification

### 4.1 End-to-End Test
- [ ] Create a realistic feature PR in target repo
- [ ] Generate tests through all 3 phases
- [ ] Review generated test quality
- [ ] Run generated tests locally

### 4.2 Context Persistence (if using S3)
- [ ] Complete one PR
- [ ] Start a new PR
- [ ] Verify context loads faster
- [ ] Check S3 bucket has correct structure

### 4.3 Documentation
- [ ] Update team documentation with usage instructions
- [ ] Share workflow with team members
- [ ] Document any customizations made

---

## Rollback Plan

If issues occur:

1. **Disable workflow**: Rename or delete `.github/workflows/generate-tests.yml`
2. **Remove labels**: Delete the test generation labels
3. **Clear S3 context**: `aws s3 rm s3://bucket/repo-prefix/ --recursive`

---

## Support Contacts

| Issue | Contact |
|-------|---------|
| Anthropic API | support@anthropic.com |
| AWS S3 | AWS Support |
| GitHub Actions | GitHub Support |
| This project | [Issues](../../issues) |

---

## Deployment Log

| Date | Repo | Deployer | Notes |
|------|------|----------|-------|
| | | | |
| | | | |
| | | | |
